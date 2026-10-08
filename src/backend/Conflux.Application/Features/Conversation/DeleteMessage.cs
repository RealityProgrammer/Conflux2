using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record DeleteMessageCommand(Guid ConversationId, Guid RequesterUserId, Guid MessageId) : ICommand<Result>;

public sealed record MessageDeletedNotification(Guid ConversationId, Guid MessageId) : INotification;

public sealed class DeleteMessageHandler(
    IMessageRepository messageRepository,
    IConversationAuthorizeService conversationAuthorizeService,
    TimeProvider timeProvider,
    IPublisher publisher,
    ILogger<DeleteMessageHandler> logger
) : ICommandHandler<DeleteMessageCommand, Result> {
    public async ValueTask<Result> Handle(DeleteMessageCommand command, CancellationToken cancellationToken) {
        var messageInfo = await messageRepository
            .AsQueryable()
            .Where(m => m.Id == command.MessageId && m.ConversationId == command.ConversationId)
            .Select(m => new { m.Id, m.ConversationId, m.DeletedAt })
            .FirstOrDefaultAsync(cancellationToken);
        
        if (messageInfo == null || messageInfo.ConversationId != command.ConversationId) {
            return Errors.ResourceNotFound("Message");
        }
        
        if (!await conversationAuthorizeService.CanDeleteMessage(command.RequesterUserId, messageInfo.ConversationId, cancellationToken)) {
            return Errors.Forbidden("User is not allowed to delete message in this conversation.");
        }
        
        if (messageInfo.DeletedAt != null) {
            return Result.Success();
        }

        try {
            int changed = await messageRepository
                .AsQueryable()
                .Where(m => m.Id == command.MessageId)
                .ExecuteUpdateAsync(builder => {
                    builder.SetProperty(m => m.DeletedAt, timeProvider.GetUtcNow());
                }, cancellationToken);

            if (changed == 0) {
                return Errors.OperationFailure("delete message.");
            }
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while deleting message.");
            return Errors.UnexpectedError();
        }

        await publisher.Publish(new MessageDeletedNotification(command.ConversationId, messageInfo.Id), CancellationToken.None);
        
        return Result.Success();
    }
}