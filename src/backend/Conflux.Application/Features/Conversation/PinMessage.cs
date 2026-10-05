using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record PinMessageCommand(
    Guid UserId, 
    Guid ConversationId, 
    Guid MessageId
) : ICommand<Result<TimelineMessageDto>>;

internal sealed class PinMessageHandler(
    IConversationRepository conversationRepository,
    IMessageRepository messageRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork,
    IConversationParticipantsProvider conversationParticipantsProvider,
    TimeProvider timeProvider,
    ILogger<PinMessageHandler> logger,
    IPublisher publisher
) : ICommandHandler<PinMessageCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(PinMessageCommand command, CancellationToken cancellationToken) {
        Guid conversationId = command.ConversationId;
        
        Message publishingMessage;
        
        Domain.Entities.Conversation? conversation = await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == conversationId)
            .FirstOrDefaultAsync(cancellationToken);

        if (conversation == null) {
            return Errors.ResourceNotFound("Conversation", [new("Id", conversationId.ToString())]);
        }

        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        await unitOfWork.BeginTransactionAsync(cancellationToken);

        try {
            int changed = await messageRepository
                .AsQueryable()
                .Where(m => m.Type == MessageType.Message && m.Id == command.MessageId && m.ConversationId == conversationId && m.PinnedAt == null)
                .ExecuteUpdateAsync(builder => {
                    builder.SetProperty(m => m.PinnedAt, utcNow);
                }, cancellationToken);

            if (changed == 0) {
                await unitOfWork.RollbackAsync(cancellationToken);
                
                return Errors.ResourceNotFound("Message", [
                    new(nameof(Message.ConversationId), conversationId.ToString()),
                    new(nameof(Message.Id), command.MessageId.ToString()),
                    new(nameof(Message.Type), nameof(MessageType.Message)),
                ]);
            }

            Message message = new() {
                SenderUserId = command.UserId,
                Type = MessageType.Pin,
                Conversation = conversation,
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
            return Errors.OperationFailure("pin message");
        }
        
        // publish notification
        TimelineMessageDto messageDto = new(publishingMessage) {
            Sender = await userRepository
                .AsQueryable()
                .Where(s => s.Id == command.UserId)
                .SelectFacet<TimelineMessageSenderDto>()
                .FirstOrDefaultAsync(CancellationToken.None),
        };

        await publisher.Publish(new MessageReceivedNotification(conversationId, messageDto), CancellationToken.None);
        
        // publish a conversation updated if conversation is type Direct
        if (conversation.Type == ConversationType.Direct) {
            IReadOnlyCollection<Guid> directConversationParticipantIds = 
                await conversationParticipantsProvider.GetDirectConversationParticipantIds(conversationId, CancellationToken.None);

            await publisher.Publish(new DirectConversationUpdatedNotification(conversationId, directConversationParticipantIds), CancellationToken.None);
        }
        
        return Result<TimelineMessageDto>.Success(messageDto);
    }
}