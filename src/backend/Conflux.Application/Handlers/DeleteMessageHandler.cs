using Conflux.Application.Commands;
using Conflux.Application.Notifications;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class DeleteMessageHandler(
    IMessageRepository messageRepository,
    IConversationRepository conversationRepository,
    IChannelAuthorizationService channelAuthorizationService,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IMediator mediator
) : ICommandHandler<DeleteMessageCommand, Result> {
    public async ValueTask<Result> Handle(DeleteMessageCommand request, CancellationToken cancellationToken) {
        var message = await messageRepository.GetById(request.MessageId, cancellationToken);
        
        if (message == null) {
            return Errors.ResourceNotFound("Message");
        }
        
        if (message.SenderUserId != request.RequesterUserId) {
            return Errors.Forbidden("You do not have permission to delete this message.");
        }
       
        Result<ChannelMetadata> getChannelMetadataResult = 
            await conversationRepository.GetChannelMetadata(message.ConversationId, cancellationToken);
        
        if (!getChannelMetadataResult.IsSuccess) {
            return getChannelMetadataResult.Error;
        }
        
        ChannelMetadata channelMetadata = getChannelMetadataResult.Value!;
        
        Result<MessagingPermissions> authResult = await channelAuthorizationService.GetMessagingPermissions(
            request.RequesterUserId, 
            channelMetadata.ChannelId, 
            channelMetadata.ChannelType
        );

        if (!authResult.IsSuccess) {
            return authResult.Error;
        }

        MessagingPermissions permissions = authResult.Value;

        if (!permissions.HasFlag(MessagingPermissions.DeleteMessage)) {
            return Errors.Forbidden("You do not have permission to delete this message.");
        }

        if (message.DeletedAt != null) {
            return Result.Success();
        }

        message.DeletedAt = timeProvider.GetUtcNow();
        
        await unitOfWork.SaveChangesAsync(cancellationToken);
        
        await mediator.Publish(new MessageDeletedNotification(channelMetadata.ChannelId, message.Id), CancellationToken.None);
        
        return Result.Success();
    }
}