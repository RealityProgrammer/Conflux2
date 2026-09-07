using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Messages;

public sealed record EditMessageCommand(
    Guid SenderUserId, 
    Guid MessageId, 
    string? Body
) : ICommand<Result<TimelineMessageDto>>;

public sealed record MessageEditedNotification(Guid ChannelId, TimelineMessageDto TimelineMessage) : INotification;

public sealed class EditMessageHandler(
    IMessageRepository messageRepository,
    IConversationRepository conversationRepository,
    IChannelAuthorizationService channelAuthorizationService,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IMediator mediator
) : ICommandHandler<EditMessageCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(EditMessageCommand request, CancellationToken cancellationToken) {
        var message = await messageRepository.GetById(request.MessageId, cancellationToken);
        var newBody = request.Body;
        
        if (message == null) {
            return Errors.ResourceNotFound("Message");
        }
        
        if (message.SenderUserId != request.SenderUserId) {
            return Errors.Forbidden("You do not have permission to edit this message.");
        }
       
        Result<ChannelMetadataDto> getChannelMetadataResult = 
            await conversationRepository.GetChannelMetadata(message.ConversationId, cancellationToken);
        
        if (!getChannelMetadataResult.IsSuccess) {
            return getChannelMetadataResult.Error;
        }
        
        ChannelMetadataDto channelMetadata = getChannelMetadataResult.Value!;
        
        Result<MessagingPermissions> authResult = await channelAuthorizationService.GetMessagingPermissions(
            request.SenderUserId, 
            channelMetadata.ChannelId, 
            channelMetadata.ChannelType
        );

        if (!authResult.IsSuccess) {
            return authResult.Error;
        }

        MessagingPermissions permissions = authResult.Value;

        if (!permissions.HasFlag(MessagingPermissions.EditMessage)) {
            return Errors.Forbidden("You do not have permission to edit this message.");
        }
        
        ReplyToMessageDto? reply = message.ReplyToId.HasValue ? 
            await messageRepository.GetReplyMessageById(message.ReplyToId.Value, CancellationToken.None) :
            null;
        
        // if body is not changed, return success instantly.
        if (message.Body == newBody) {
            return Result<TimelineMessageDto>.Success(new(
                message.Id, 
                message.SenderUserId,
                newBody,
                message.Attachments,
                message.CreatedAt,
                reply
            ));
        }
        
        message.Body = newBody;
        message.UpdatedAt = timeProvider.GetUtcNow();
        
        await unitOfWork.SaveChangesAsync(cancellationToken);

        TimelineMessageDto dto = new(
            message.Id,
            message.SenderUserId,
            message.Body,
            message.Attachments,
            message.CreatedAt,
            reply
        );
        
        await mediator.Publish(new MessageEditedNotification(channelMetadata.ChannelId, dto), CancellationToken.None);
        
        return Result<TimelineMessageDto>.Success(dto);
    }
}