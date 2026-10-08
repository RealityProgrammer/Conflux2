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
    IConversationAuthorizeService conversationAuthorizeService,
    IPublisher publisher,
    ILogger<EditMessageHandler> logger
) : ICommandHandler<EditMessageCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(EditMessageCommand command, CancellationToken cancellationToken) {
        var message = await messageRepository
            .AsQueryable()
            .Where(m => m.Id == command.MessageId)
            .Include(m => m.Sender)
            .FirstOrDefaultAsync(cancellationToken);
        
        var newBody = command.Body;
        
        if (message == null || message.ConversationId != command.ConversationId) {
            return Errors.ResourceNotFound("Message");
        }
        
        if (!await conversationAuthorizeService.CanEditMessage(command.SenderUserId, message.ConversationId, cancellationToken)) {
            return Errors.Forbidden("User is not allowed to edit message in this conversation.");
        }
        
        if (message.SenderUserId != command.SenderUserId) {
            return Errors.Forbidden("User is not allowed to edit other user message.");
        }
       
        // if body is not changed, return success instantly.
        if (message.Body == newBody) {
            return Result<TimelineMessageDto>.Success(new(message));
        }
        
        message.Body = newBody;
        message.UpdatedAt = timeProvider.GetUtcNow();

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while editing message.");
            return Errors.UnexpectedError();
        }

        TimelineMessageDto dto = new(message);  // GetById should include the ReplyTo, so no need to load it into memory automatically
        
        await publisher.Publish(new MessageEditedNotification(command.ConversationId, dto), CancellationToken.None);
        
        return Result<TimelineMessageDto>.Success(dto);
    }
}