using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Messages;

public sealed record DeleteMessageCommand(Guid ConversationId, Guid RequesterUserId, Guid MessageId) : ICommand<Result>;

public sealed record MessageDeletedNotification(Guid ConversationId, Guid MessageId) : INotification;

public sealed class DeleteMessageHandler(
    IMessageRepository messageRepository,
    // IConversationRepository conversationRepository,
    // IConversationAuthorizeService conversationAuthorizeService,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IMediator mediator
) : ICommandHandler<DeleteMessageCommand, Result> {
    public async ValueTask<Result> Handle(DeleteMessageCommand command, CancellationToken cancellationToken) {
        var message = await messageRepository
            .AsQueryable()
            .Where(m => m.Id == command.MessageId)
            .FirstOrDefaultAsync(cancellationToken);
        
        if (message == null) {
            return Errors.ResourceNotFound("Message");
        }
        
        if (message.SenderUserId != command.RequesterUserId) {
            return Errors.Forbidden("You do not have permission to delete this message.");
        }
        
        if (message.DeletedAt != null) {
            return Result.Success();
        }

        message.DeletedAt = timeProvider.GetUtcNow();
        
        await unitOfWork.SaveChangesAsync(cancellationToken);
        
        await mediator.Publish(new MessageDeletedNotification(command.ConversationId, message.Id), CancellationToken.None);
        
        return Result.Success();
    }
}