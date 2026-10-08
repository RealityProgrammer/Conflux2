using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record EditMessageCommand(
    Guid ConversationId,
    Guid SenderUserId, 
    Guid MessageId, 
    string? Body
) : ICommand<Result>;

public sealed record MessageEditedNotification(Guid ConversationId, EditedMessageDto Message) : INotification;

public sealed class EditMessageHandler(
    IMessageRepository messageRepository,
    TimeProvider timeProvider,
    IConversationAuthorizeService conversationAuthorizeService,
    IPublisher publisher,
    ILogger<EditMessageHandler> logger
) : ICommandHandler<EditMessageCommand, Result> {
    public async ValueTask<Result> Handle(EditMessageCommand command, CancellationToken cancellationToken) {
        var messageInfo = await messageRepository
            .AsQueryable()
            .Where(m => m.Id == command.MessageId && m.ConversationId == command.ConversationId && m.SenderUserId == command.SenderUserId)
            .Select(m => new { m.SenderUserId })
            .FirstOrDefaultAsync(cancellationToken);
        
        if (messageInfo == null) {
            return Errors.ResourceNotFound("Message", [
                new(nameof(Message.Id), command.MessageId.ToString()),
            ]);
        }
        
        if (!await conversationAuthorizeService.CanEditMessage(command.SenderUserId, command.ConversationId, cancellationToken)) {
            return Errors.Forbidden("User is not allowed to edit message in this conversation.");
        }
        
        if (messageInfo.SenderUserId != command.SenderUserId) {
            return Errors.Forbidden("User is not allowed to edit other user message.");
        }

        try {
            int changed = await messageRepository
                .AsQueryable()
                .Where(m => m.Id == command.MessageId && m.ConversationId == command.ConversationId && m.SenderUserId == command.SenderUserId)
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