using Conflux.Application.Dto;
using Conflux.Application.FileFormats;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Messages;

public sealed record SendMessageCommand(
    Guid SenderUserId,
    Guid ChannelId,
    string? Body,
    IReadOnlyList<UploadFile> Attachments,
    Guid? ReplyToId
) : ICommand<Result<TimelineMessageDto>>;

public sealed record MessageReceivedNotification(Guid ChannelId, TimelineMessageDto Message) : INotification;

public sealed record UpdateDmConversationListNotification(
    Guid SenderUserId,
    Guid ChannelId, 
    Guid ReceiverUserId
) : INotification;

public sealed class SendMessageHandler(
    IChannelRepository channelRepository,
    IMessageRepository messageRepository,
    IChannelAuthorizationService channelAuthorizationService,
    IConversationRepository conversationRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    TimeProvider timeProvider,
    IMessageMediaService messageMediaService
) : ICommandHandler<SendMessageCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(SendMessageCommand request, CancellationToken cancellationToken) {
        Guid channelId = request.ChannelId;
        Guid senderUserId = request.SenderUserId;

        Result<ChannelMetadataDto> getChannelMetadataResult = 
            await channelRepository.GetChannelMetadataFromChannelId(channelId, cancellationToken);
        
        if (!getChannelMetadataResult.IsSuccess) {
            return getChannelMetadataResult.Error;
        }
        
        ChannelMetadataDto channelMetadata = getChannelMetadataResult.Value!;

        Result<MessagingPermissions> authResult = await channelAuthorizationService.GetMessagingPermissions(
            senderUserId, 
            channelId, 
            channelMetadata.ChannelType
        );

        if (!authResult.IsSuccess) {
            return authResult.Error;
        }

        MessagingPermissions permissions = authResult.Value;

        if (!permissions.HasFlag(MessagingPermissions.SendMessage)) {
            return Errors.Forbidden("You do not have permission to send message.");
        }

        var utcNow = timeProvider.GetUtcNow();
        
        // upload attachments
        Attachment[] attachments = [];
        if (request.Attachments.Count > 0) {
            Result<Attachment[]> attachmentResults = await UploadAttachments(request.Attachments, cancellationToken);

            if (!attachmentResults.IsSuccess) {
                return attachmentResults.Error;
            }

            attachments = attachmentResults.Value!;
        }

        Message message = new() {
            Body = request.Body,
            Attachments = attachments,
            SenderUserId = senderUserId,
            ConversationId = channelMetadata.ConversationId,
            ReplyToId = request.ReplyToId,
            CreatedAt = utcNow,
        };
        
        await unitOfWork.BeginTransactionAsync(cancellationToken);

        try {
            messageRepository.Add(message);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            
            await conversationRepository.UpdateLatestMessageTime(channelMetadata.ConversationId, utcNow);
            
            // load the reply message into memory so that dto the message got the reply to convert to dto
            if (request.ReplyToId.HasValue) {
                await messageRepository
                    .AsQueryable()
                    .FirstOrDefaultAsync(m => m.Id == request.ReplyToId.Value, cancellationToken);
            }

            await unitOfWork.CommitAsync(cancellationToken);
        } catch (OperationCanceledException) {
            await unitOfWork.RollbackAsync(CancellationToken.None);
            await DeleteUploadedAttachments(attachments);
            throw;
        } catch {
            await unitOfWork.RollbackAsync(cancellationToken);
            await DeleteUploadedAttachments(attachments);
            return Errors.OperationFailure("send message.");
        }
        
        TimelineMessageDto dto = new(message);
        await mediator.Publish(new MessageReceivedNotification(channelId, dto), CancellationToken.None);
        
        // if the channel type is DM, emit the notification to update the conversation list on the sidebar
        if (channelMetadata.ChannelType == ChannelType.DirectMessage) {
            var dmSummary = 
                (await channelRepository.GetDmChannelSummary(senderUserId, channelId)).Value!;
            
            await mediator.Publish(new UpdateDmConversationListNotification(
                senderUserId,
                channelMetadata.ChannelId,
                dmSummary.OtherUser.Id
            ), CancellationToken.None);
        }

        return Result<TimelineMessageDto>.Success(dto);
    }

    private async Task<Result<Attachment[]>> UploadAttachments(
        IReadOnlyList<UploadFile> attachments, 
        CancellationToken cancellationToken
    ) {
        Attachment?[] finalAttachments = new Attachment?[attachments.Count];
        
        for (int i = 0; i < attachments.Count; i++) {
            var attachment = attachments[i];
            

            try {
                Result<Attachment> uploaded = 
                    await messageMediaService.UploadAttachment(attachment.Stream, attachment.FileName, cancellationToken);

                if (uploaded.IsSuccess) {
                    finalAttachments[i] = uploaded.Value;
                } else {
                    await DeleteUploadedAttachments(finalAttachments);
                    return Errors.AttachmentUploadFailure();
                }
            } catch (OperationCanceledException) {
                await DeleteUploadedAttachments(finalAttachments);
                throw;
            }
        }

        return Result<Attachment[]>.Success(finalAttachments!);
    }
    
    private async ValueTask DeleteUploadedAttachments(IEnumerable<Attachment?> attachments) {
        foreach (var attachment in attachments) {
            if (attachment != null && attachment.Id != Guid.Empty) {
                await messageMediaService.DeleteAttachment(attachment.Id, CancellationToken.None);
            }
        }
    }
}