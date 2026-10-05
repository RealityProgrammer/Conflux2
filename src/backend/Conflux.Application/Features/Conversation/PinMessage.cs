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
    IMessageRepository messageRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    ILogger<PinMessageHandler> logger,
    IPublisher publisher
) : ICommandHandler<PinMessageCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(PinMessageCommand command, CancellationToken cancellationToken) {
        Message publishingMessage;
        DateTimeOffset utcNow = timeProvider.GetUtcNow();

        await unitOfWork.BeginTransactionAsync(cancellationToken);

        try {
            int changed = await messageRepository
                .AsQueryable()
                .Where(m => m.Type == MessageType.Message && m.Id == command.MessageId && m.ConversationId == command.ConversationId && m.PinnedAt == null)
                .ExecuteUpdateAsync(builder => {
                    builder.SetProperty(m => m.PinnedAt, utcNow);
                }, cancellationToken);

            if (changed == 0) {
                await unitOfWork.RollbackAsync(cancellationToken);
                
                return Errors.ResourceNotFound("Message", [
                    new(nameof(Message.ConversationId), command.ConversationId.ToString()),
                    new(nameof(Message.Id), command.MessageId.ToString()),
                    new(nameof(Message.Type), nameof(MessageType.Message)),
                ]);
            }

            Message message = new() {
                SenderUserId = command.UserId,
                Type = MessageType.Pin,
                ConversationId = command.ConversationId,
            };

            messageRepository.Add(message);

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

        await publisher.Publish(new MessageReceivedNotification(command.ConversationId, messageDto), CancellationToken.None);
        return Result<TimelineMessageDto>.Success(messageDto);
    }
}