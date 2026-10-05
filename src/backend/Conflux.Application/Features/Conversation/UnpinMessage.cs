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
    Guid UserId, 
    Guid ConversationId, 
    Guid MessageId
) : ICommand<Result<TimelineMessageDto>>;

internal sealed class UnpinMessageHandler(
    IMessageRepository messageRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<UnpinMessageHandler> logger
) : ICommandHandler<UnpinMessageCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(UnpinMessageCommand command, CancellationToken cancellationToken) {
        Message publishingMessage;
        await unitOfWork.BeginTransactionAsync(cancellationToken);

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
                SenderUserId = command.UserId,
                Type = MessageType.Unpin,
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
            return Errors.OperationFailure("unpin message");
        }

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