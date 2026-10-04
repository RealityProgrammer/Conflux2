using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record PinMessageCommand(Guid UserId, Guid ConversationId, Guid MessageId) : ICommand<Result>;

internal sealed class PinMessageHandler(
    IMessageRepository messageRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    ILogger<PinMessageHandler> logger
) : ICommandHandler<PinMessageCommand, Result> {
    public async ValueTask<Result> Handle(PinMessageCommand command, CancellationToken cancellationToken) {
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

            await unitOfWork.CommitAsync(cancellationToken);
            return Result.Success();
        } catch (OperationCanceledException) {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while pinning message.");
            await unitOfWork.RollbackAsync(cancellationToken);
            return Errors.OperationFailure("pin message");
        }
    }
}