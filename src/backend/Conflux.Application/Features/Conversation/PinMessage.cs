using Conflux.Application.Enums;
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
    Guid ConversationId, 
    Guid MessageId,
    MessagePinAction Action
) : ICommand<Result<TimelineMessageDto>>, IConversationCommand;

public sealed record MessagePinnedNotification(Guid ConversationId) : INotification;
public sealed record MessageUnpinnedNotification(Guid ConversationId, Guid MessageId) : INotification;

internal sealed class PinMessageHandler(
    ICurrentUserService currentUserService,
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
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        Guid conversationId = command.ConversationId;
        Guid messageId = command.MessageId;
        MessagePinAction action = command.Action;
        
        Message message;
        
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
                .Where(m => m.Type == MessageType.Message && m.Id == messageId && m.ConversationId == conversationId && m.PinnedAt == null)
                .ExecuteUpdateAsync(builder => {
                    builder.SetProperty(m => m.PinnedAt, action == MessagePinAction.Pin ? utcNow : null);
                }, cancellationToken);
            
            if (changed == 0) {
                await unitOfWork.RollbackAsync(cancellationToken);
                
                return Errors.ResourceNotFound("Message", [
                    new(nameof(Message.ConversationId), conversationId.ToString()),
                    new(nameof(Message.Id), messageId.ToString()),
                    new(nameof(Message.Type), nameof(MessageType.Message)),
                ]);
            }

            message = new() {
                Type = action == MessagePinAction.Pin ?  MessageType.Pin : MessageType.Unpin,
                Conversation = conversation,
                SenderUserId = userId,
            };

            messageRepository.Add(message);

            conversation.LatestMessageAt = utcNow;

            await unitOfWork.SaveChangesAsync(cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);
        } catch (OperationCanceledException) {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while pinning message.");
            await unitOfWork.RollbackAsync(cancellationToken);
            
            return Errors.OperationFailure(action == MessagePinAction.Pin ? "pin message" : "unpin message");
        }

        TimelineMessageDto messageDto = new(
            message.Id,
            message.Type,
            await userRepository
                .AsQueryable()
                .Where(s => s.Id == message.SenderUserId)
                .Select(u => new TimelineMessageSenderDto(u.Id, u.DisplayName, u.AvatarVersion))
                .FirstOrDefaultAsync(CancellationToken.None),
            null,
            null,
            null,
            null,
            message.CreatedAt,
            null,
            message.ConversationId,
            false,
            null,
            null
        );

        await publisher.Publish(new MessageReceivedNotification(conversationId, messageDto), CancellationToken.None);

        if (action == MessagePinAction.Pin) {
            await publisher.Publish(new MessagePinnedNotification(conversationId), CancellationToken.None);
        } else {
            await publisher.Publish(new MessageUnpinnedNotification(conversationId, messageId), CancellationToken.None);
        }
        
        // publish a conversation updated if conversation is type Direct
        if (conversation.Type == ConversationType.Direct) {
            IReadOnlyCollection<Guid> directConversationParticipantIds = 
                await conversationParticipantsProvider.GetDirectConversationParticipantIds(conversationId, CancellationToken.None);

            await publisher.Publish(new DirectConversationUpdatedNotification(conversationId, directConversationParticipantIds), CancellationToken.None);
        }
        
        return Result<TimelineMessageDto>.Success(messageDto);
    }
}