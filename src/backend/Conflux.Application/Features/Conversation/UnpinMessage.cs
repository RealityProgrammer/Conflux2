using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record UnpinMessageCommand(
    Guid ConversationId, 
    Guid MessageId
) : ICommand<Result<TimelineMessageDto>>, IConversationCommand;

public sealed record MessageUnpinnedNotification(Guid ConversationId, Guid MessageId) : INotification;

internal sealed class UnpinMessageHandler(
    ICurrentUserService currentUserService,
    IConversationRepository conversationRepository,
    IMessageRepository messageRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork,
    IConversationParticipantsProvider conversationParticipantsProvider,
    IPublisher publisher,
    TimeProvider timeProvider,
    ILogger<UnpinMessageHandler> logger
) : ICommandHandler<UnpinMessageCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(UnpinMessageCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        Guid conversationId = command.ConversationId;
        
        Message publishingMessage;
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        Domain.Entities.Conversation? conversation = await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == conversationId)
            .FirstOrDefaultAsync(cancellationToken);

        if (conversation == null) {
            return Errors.ResourceNotFound("Conversation", [new("Id", conversationId.ToString())]);
        }

        try {
            int changed = await messageRepository
                .AsQueryable()
                .Where(m => m.Type == MessageType.Message && m.Id == command.MessageId && m.ConversationId == command.ConversationId && m.PinnedAt != null)
                .ExecuteUpdateAsync(builder => {
                    builder.SetProperty(m => m.PinnedAt, (DateTimeOffset?)null);
                }, cancellationToken);

            if (changed == 0) {
                return Errors.ResourceNotFound("Message", [
                    new(nameof(Message.ConversationId), command.ConversationId.ToString()),
                    new(nameof(Message.Id), command.MessageId.ToString()),
                    new(nameof(Message.Type), nameof(MessageType.Message)),
                ]);
            }

            Message message = new() {
                SenderUserId = userId,
                Type = MessageType.Unpin,
                ConversationId = command.ConversationId,
            };

            messageRepository.Add(message);
            
            conversation.LatestMessageAt = utcNow;

            await unitOfWork.SaveChangesAsync(cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);

            publishingMessage = message;
        } catch (OperationCanceledException) {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while pinning message.");
            
            await unitOfWork.RollbackAsync(cancellationToken);
            return Errors.OperationFailure("unpin message");
        }

        TimelineMessageDto messageDto = new(publishingMessage) {
            Sender = await userRepository
                .AsQueryable()
                .Where(s => s.Id == userId)
                .SelectFacet<TimelineMessageSenderDto>()
                .FirstOrDefaultAsync(CancellationToken.None),
        };

        await publisher.Publish(new MessageReceivedNotification(command.ConversationId, messageDto), CancellationToken.None);
        await publisher.Publish(new MessageUnpinnedNotification(command.ConversationId, command.MessageId), CancellationToken.None);
        
        if (conversation.Type == ConversationType.Direct) {
            IReadOnlyCollection<Guid> directConversationParticipantIds = 
                await conversationParticipantsProvider.GetDirectConversationParticipantIds(conversationId, CancellationToken.None);

            await publisher.Publish(new DirectConversationUpdatedNotification(conversationId, directConversationParticipantIds), CancellationToken.None);
        }
        
        return Result<TimelineMessageDto>.Success(messageDto);
    }
}