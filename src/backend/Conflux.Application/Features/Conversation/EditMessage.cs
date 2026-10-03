using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record EditMessageCommand(
    Guid ConversationId,
    Guid SenderUserId, 
    Guid MessageId, 
    string? Body
) : ICommand<Result<TimelineMessageDto>>;

public sealed record MessageEditedNotification(Guid ConversationId, TimelineMessageDto Message) : INotification;

public sealed class EditMessageHandler(
    IMessageRepository messageRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IMediator mediator
) : ICommandHandler<EditMessageCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(EditMessageCommand command, CancellationToken cancellationToken) {
        var message = await messageRepository
            .AsQueryable()
            .Where(m => m.Id == command.MessageId)
            .FirstOrDefaultAsync(cancellationToken);
        
        var newBody = command.Body;
        
        if (message == null || message.ConversationId != command.ConversationId) {
            return Errors.ResourceNotFound("Message");
        }
        
        if (message.SenderUserId != command.SenderUserId) {
            return Errors.Forbidden("You do not have permission to edit this message.");
        }
       
        // if body is not changed, return success instantly.
        if (message.Body == newBody) {
            return Result<TimelineMessageDto>.Success(new(message));
        }
        
        message.Body = newBody;
        message.UpdatedAt = timeProvider.GetUtcNow();
        
        await unitOfWork.SaveChangesAsync(cancellationToken);

        TimelineMessageDto dto = new(message);  // GetById should include the ReplyTo, so no need to load it into memory automatically
        
        await mediator.Publish(new MessageEditedNotification(command.ConversationId, dto), CancellationToken.None);
        
        return Result<TimelineMessageDto>.Success(dto);
    }
}