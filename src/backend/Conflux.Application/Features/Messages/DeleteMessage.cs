using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Messages;

public sealed record DeleteMessageCommand(Guid RequesterUserId, Guid MessageId) : ICommand<Result>;

public sealed record MessageDeletedNotification(Guid ChannelId, Guid MessageId) : INotification;

public sealed class DeleteMessageHandler(
    IMessageRepository messageRepository,
    IConversationRepository conversationRepository,
    IChannelAuthorizationService channelAuthorizationService,
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
       
        Result<ChannelMetadataDto> getChannelMetadataResult = 
            await conversationRepository.GetChannelMetadata(message.ConversationId, cancellationToken);
        
        if (!getChannelMetadataResult.IsSuccess) {
            return getChannelMetadataResult.Error;
        }
        
        ChannelMetadataDto channelMetadata = getChannelMetadataResult.Value!;
        
        Result<MessagingPermissions> authResult = await channelAuthorizationService.GetMessagingPermissions(
            command.RequesterUserId, 
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