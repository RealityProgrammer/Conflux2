using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record EditMessageCommand(
    Guid ConversationId,
    Guid MessageId, 
    string? Body
) : ICommand<Result>, IConversationCommand;

public sealed record MessageEditedNotification(Guid ConversationId, EditedMessageDto Message) : INotification;

public sealed class EditMessageHandler(
    ICurrentUserService currentUserService,
    IMessageRepository messageRepository,
    TimeProvider timeProvider,
    IConversationAuthorizeService conversationAuthorizeService,
    IPublisher publisher,
    ILogger<EditMessageHandler> logger
) : ICommandHandler<EditMessageCommand, Result> {
    public async ValueTask<Result> Handle(EditMessageCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        Guid messageId = command.MessageId;
        Guid conversationId = command.ConversationId;
        
        var messageInfo = await messageRepository
            .AsQueryable()
            .Where(m => m.Id == messageId && m.ConversationId == conversationId)
            .Select(m => new { m.SenderUserId })
            .FirstOrDefaultAsync(cancellationToken);
        
        if (messageInfo == null) {
            return Errors.ResourceNotFound("Message", [
                new(nameof(Message.Id), messageId.ToString()),
                new(nameof(Message.ConversationId), conversationId.ToString()),
            ]);
        }
        
        if (!await conversationAuthorizeService.CanEditMessage(userId, command.ConversationId, cancellationToken)) {
            return Errors.Forbidden("User is not allowed to edit message in this conversation.");
        }
        
        if (messageInfo.SenderUserId != userId) {
            return Errors.Forbidden("User is not allowed to edit other user message.");
        }

        try {
            int changed = await messageRepository
                .AsQueryable()
                .Where(m => m.Id == messageId)
                .ExecuteUpdateAsync(builder => {
                    builder.SetProperty(m => m.Body, command.Body);
                    builder.SetProperty(m => m.UpdatedAt, timeProvider.GetUtcNow());
                }, cancellationToken);

            if (changed == 0) {
                return Errors.OperationFailure("edit message");
            }
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while editing message.");
            return Errors.UnexpectedError();
        }

        await publisher.Publish(
            new MessageEditedNotification(command.ConversationId, new(command.MessageId, command.Body)), 
            CancellationToken.None
        );
        
        return Result.Success();
    }
}