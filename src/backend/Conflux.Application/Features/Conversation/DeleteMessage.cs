using Conflux.Application.Features.Servers;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record DeleteMessageCommand(
    Guid ConversationId,
    Guid MessageId
) : ICommand<Result>, IConversationCommand;

public sealed record MessageDeletedNotification(Guid ConversationId, Guid MessageId) : INotification;

public sealed class DeleteMessageHandler(
    ICurrentUserService currentUserService,
    IMessageRepository messageRepository,
    IConversationAuthorizeService conversationAuthorizeService,
    TimeProvider timeProvider,
    IPublisher publisher,
    ILogger<DeleteMessageHandler> logger
) : ICommandHandler<DeleteMessageCommand, Result> {
    public async ValueTask<Result> Handle(DeleteMessageCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        Guid messageId = command.MessageId;
        Guid conversationId = command.ConversationId;
        
        var messageInfo = await messageRepository
            .AsQueryable()
            .Where(m => m.Id == messageId && m.ConversationId == conversationId)
            .Select(m => new { m.Id, m.ConversationId, m.SenderUserId, m.DeletedAt })
            .FirstOrDefaultAsync(cancellationToken);
        
        if (messageInfo == null) {
            return Errors.ResourceNotFound("Message");
        }
        
        if (!await conversationAuthorizeService.CanDeleteMessage(userId, conversationId, cancellationToken)) {
            return Errors.Forbidden("User is not allowed to delete message in this conversation.");
        }
        
        if (messageInfo.SenderUserId != userId) {
            return Errors.Forbidden("User is not allowed to delete other user message.");
        }
        
        if (messageInfo.DeletedAt != null) {
            return Result.Success();
        }

        try {
            int changed = await messageRepository
                .AsQueryable()
                .Where(m => m.Id == messageId)
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

        await publisher.Publish(new MessageDeletedNotification(conversationId, messageInfo.Id), CancellationToken.None);
        
        return Result.Success();
    }
}