using Conflux.Application.Features.Notifications;
using Conflux.Application.FileFormats;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;

namespace Conflux.Application.Features.Commands.SendMessage;

public sealed class SendMessageHandler(
    IChannelRepository channelRepository,
    IMessageRepository messageRepository,
    IChannelAuthorizationService channelAuthorizationService,
    IConversationRepository conversationRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    IBlobStorage blobStorage,
    IFileFormatInspector fileFormatInspector,
    TimeProvider timeProvider
) : ICommandHandler<SendMessageCommand, Result<MessageDto>> {
    public async ValueTask<Result<MessageDto>> Handle(SendMessageCommand request, CancellationToken cancellationToken) {
        Guid channelId = request.ChannelId;
        Guid senderUserId = request.SenderUserId;

        Result<ChannelMetadata> getChannelMetadataResult = 
            await channelRepository.GetChannelMetadataFromChannelId(channelId, cancellationToken);
        
        if (!getChannelMetadataResult.IsSuccess) {
            return getChannelMetadataResult.Error;
        }
        
        ChannelMetadata channelMetadata = getChannelMetadataResult.Value!;

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
        if (request.AttachmentStreams.Count > 0) {
            Result<Attachment[]> attachmentResults = await UploadAttachments(request.AttachmentStreams, cancellationToken);

            if (!attachmentResults.IsSuccess) {
                return attachmentResults.Error;
            }
        }
        
        Message message = new() {
            Body = request.Body,
            Attachments = attachments,
            SenderUserId = senderUserId,
            ConversationId = channelMetadata.ConversationId,
            ReplyToId = request.ReplyToId,
            CreatedAt = utcNow,
        };

        messageRepository.Add(message);

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (OperationCanceledException) {
            await DeleteUploadedAttachments(attachments);
            throw;
        } catch {
            await DeleteUploadedAttachments(attachments);
            return Errors.OperationFailure("send message.");
        }

        await conversationRepository.UpdateLatestMessageTime(channelMetadata.ConversationId, utcNow);

        ReplyToMessageDto? reply = request.ReplyToId.HasValue ? 
            await messageRepository.GetReplyMessageById(request.ReplyToId.Value, CancellationToken.None) :
            null;
        
        MessageDto dto = new(
            message.Id,
            senderUserId,
            message.Body,
            message.Attachments,
            message.CreatedAt,
            reply
        );

        await mediator.Publish(new MessageReceivedNotification(channelId, dto), CancellationToken.None);
        
        // if the channel type is DM, emit the notification to update the conversation list on the sidebar
        if (channelMetadata.ChannelType == ChannelType.DirectMessage) {
            var dmSummary = 
                (await channelRepository.GetDmChannelSummary(senderUserId, channelId)).Value!;
            
            await mediator.Publish(new UpdateDmConversationListNotification(
                senderUserId,
                channelMetadata.ChannelId,
                dmSummary.OtherUser.Id,
                0
            ), CancellationToken.None);
        }

        return Result<MessageDto>.Success(dto);
    }

    private async Task<Result<Attachment[]>> UploadAttachments(
        IReadOnlyList<Stream> attachmentStreams, 
        CancellationToken cancellationToken
    ) {
        Attachment?[] attachments = new Attachment?[attachmentStreams.Count];

        for (int i = 0; i < attachments.Length; i++) {
            var stream = attachmentStreams[i];
            string mediaType;

            switch (fileFormatInspector.DetermineFileFormat(stream)) {
                case Image imageFormat:
                    switch (imageFormat) {
                        case Png pngFormat:
                            mediaType = pngFormat.MediaType;
                            break;
                        
                        case Jpeg jpegFormat:
                            mediaType = jpegFormat.MediaType;
                            break;
                        
                        case Gif gifFormat:
                            mediaType = gifFormat.MediaType;
                            break;
                        
                        case Webp webpFormat:
                            mediaType = webpFormat.MediaType;
                            break;
                        
                        default:
                            await DeleteUploadedAttachments(attachments);

                            return Errors.ValidationErrorsOccurred(new() {
                                [nameof(attachmentStreams)] = [
                                    "One of the attachments doesn't have the supported image format.",
                                ],
                            });
                    }
                    break;
                
                case MP4V1 mp4Format:
                    mediaType = mp4Format.MediaType;
                    break;
                
                case Mpeg4Iso4 mpeg4Iso4Format:
                    mediaType = mpeg4Iso4Format.MediaType;
                    break;
                
                // TODO: Add .webm once FileSignatures add it
                
                case Wav wavFormat:
                    mediaType = wavFormat.MediaType;
                    break;
                
                case null:
                    await DeleteUploadedAttachments(attachments);

                    return Errors.ValidationErrorsOccurred(new() {
                        [nameof(attachmentStreams)] = [
                            "One of the attachments have an unknown file format.",
                        ],
                    });
                
                default:
                    await DeleteUploadedAttachments(attachments);

                    return Errors.ValidationErrorsOccurred(new() {
                        [nameof(attachmentStreams)] = [
                            "One of the attachments doesn't have supported file format.",
                        ],
                    });
            }

            stream.Position = 0;

            try {
                Result<Guid> uploadResult =
                    await blobStorage.UploadMessageAttachment(new(stream, mediaType), cancellationToken);

                if (uploadResult.IsSuccess) {
                    attachments[i] = new() {
                        Id = uploadResult.Value,
                        Type = mediaType,
                    };
                } else {
                    await DeleteUploadedAttachments(attachments);
                    return Errors.AttachmentUploadFailure();
                }
            } catch (OperationCanceledException) {
                await DeleteUploadedAttachments(attachments);
                throw;
            }
        }

        return Result<Attachment[]>.Success(attachments!);
    }
    
    private async ValueTask DeleteUploadedAttachments(IEnumerable<Attachment?> attachments) {
        foreach (var attachment in attachments) {
            if (attachment != null && attachment.Id != Guid.Empty) {
                await blobStorage.DeleteMessageAttachment(attachment.Id, CancellationToken.None);
            }
        }
    }
}