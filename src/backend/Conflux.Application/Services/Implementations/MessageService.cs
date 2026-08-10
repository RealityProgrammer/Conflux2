using Conflux.Application.Dto.Notifications;
using Conflux.Application.Dto.Responses;
using Conflux.Application.FileFormats;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;
using Mediator;

namespace Conflux.Application.Services.Implementations;

public class MessagingServiceOptions {
    public long MaxAttachmentSizeBytes { get; set; } = 10485760;
}

internal sealed class MessageService(
    IUnitOfWork unitOfWork,
    IMessageRepository messageRepository,
    IUserRepository userRepository,
    IChannelRepository channelRepository,
    IStorageService storageService,
    IChannelAuthorizationService channelAuthorizationService,
    IConversationRepository conversationRepository,
    IFileFormatInspector fileFormatInspector,
    TimeProvider timeProvider,
    IMediator mediator,
    ILogger<MessageService> logger
) : IMessageService {
    public async Task<Result<MessageDto>> SendMessageAsync(
        Guid senderUserId,
        Guid channelId,
        string? body, 
        IReadOnlyList<Stream> attachmentStreams,
        Guid? replyToId,
        CancellationToken cancellationToken = default
    ) {
        Result<ChannelMetadata> getChannelMetadataResult = 
            await channelRepository.GetChannelMetadataFromChannelIdAsync(channelId, cancellationToken);
        
        if (!getChannelMetadataResult.IsSuccess) {
            return getChannelMetadataResult.Error;
        }
        
        ChannelMetadata channelMetadata = getChannelMetadataResult.Value!;

        Result<MessagingPermissions> authResult = await channelAuthorizationService.GetMessagingPermissionsAsync(
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
        Attachment?[] attachments = attachmentStreams.Count == 0 ? [] : new Attachment?[attachmentStreams.Count];

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
                            await DeleteUploadedAttachments();

                            return Errors.ValidationErrorsOccured(new() {
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
                    await DeleteUploadedAttachments();

                    return Errors.ValidationErrorsOccured(new() {
                        [nameof(attachmentStreams)] = [
                            "One of the attachments have an unknown file format.",
                        ],
                    });
                
                default:
                    await DeleteUploadedAttachments();

                    return Errors.ValidationErrorsOccured(new() {
                        [nameof(attachmentStreams)] = [
                            "One of the attachments doesn't have supported file format.",
                        ],
                    });
            }

            stream.Position = 0;

            try {
                Result<Guid> uploadResult =
                    await storageService.UploadMessageAttachmentAsync(new(stream, mediaType), cancellationToken);

                if (uploadResult.IsSuccess) {
                    attachments[i] = new() {
                        Id = uploadResult.Value,
                        Type = mediaType,
                    };
                } else {
                    await DeleteUploadedAttachments();
                    return Errors.AttachmentUploadFailure();
                }
            } catch (OperationCanceledException) {
                await DeleteUploadedAttachments();
                throw;
            }
        }
        
        Message message = new() {
            Body = body,
            Attachments = attachments!,
            SenderUserId = senderUserId,
            ConversationId = channelMetadata.ConversationId,
            ReplyToId = replyToId,
            CreatedAt = utcNow,
        };

        messageRepository.Add(message);

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (OperationCanceledException) {
            await DeleteUploadedAttachments();
            throw;
        } catch {
            await DeleteUploadedAttachments();
            return Errors.OperationFailure("send message.");
        }

        await conversationRepository.UpdateLatestMessageTimeAsync(channelMetadata.ConversationId, utcNow);
        
        MessageDto dto = new(
            message.Id,
            senderUserId,
            body,
            message.Attachments,
            message.CreatedAt,
            message.ReplyToId
        );

        await mediator.Publish(new MessageReceivedNotification(channelId, dto), CancellationToken.None);

        return Result<MessageDto>.Success(dto);

        async ValueTask DeleteUploadedAttachments() {
            foreach (var attachment in attachments) {
                if (attachment != null && attachment.Id != Guid.Empty) {
                    await storageService.DeleteMessageAttachmentAsync(attachment.Id, CancellationToken.None);
                }
            }
        }
    }

    public async Task<Result<MessageDto>> EditMessageAsync(
        Guid messageId, 
        Guid requesterUserId, 
        string? newBody, 
        CancellationToken cancellationToken = default
    ) {
        var message = await messageRepository.GetByIdAsync(messageId, cancellationToken);
        
        if (message == null) {
            return Errors.ResourceNotFound("Message");
        }
        
        if (message.SenderUserId != requesterUserId) {
            return Errors.Forbidden("You do not have permission to edit this message.");
        }
       
        Result<ChannelMetadata> getChannelMetadataResult = 
            await conversationRepository.GetChannelMetadataFromConversationIdAsync(message.ConversationId, cancellationToken);
        
        if (!getChannelMetadataResult.IsSuccess) {
            return getChannelMetadataResult.Error;
        }
        
        ChannelMetadata channelMetadata = getChannelMetadataResult.Value!;
        
        Result<MessagingPermissions> authResult = await channelAuthorizationService.GetMessagingPermissionsAsync(
            requesterUserId, 
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
        
        // if body is not changed, return success instantly.
        if (message.Body == newBody) {
            return Result<MessageDto>.Success(new(
                message.Id, 
                message.SenderUserId,
                newBody,
                message.Attachments,
                message.CreatedAt,
                message.ReplyToId
            ));
        }
        
        message.Body = newBody;
        message.UpdatedAt = timeProvider.GetUtcNow();
        
        await unitOfWork.SaveChangesAsync(cancellationToken);

        MessageDto dto = new(
            message.Id,
            message.SenderUserId,
            message.Body,
            message.Attachments,
            message.CreatedAt,
            message.ReplyToId
        );
        
        await mediator.Publish(new MessageEditedNotification(channelMetadata.ChannelId, dto), CancellationToken.None);
        
        return Result<MessageDto>.Success(dto);
    }

    public async Task<Result> DeleteMessageAsync(Guid messageId, Guid requesterUserId) {
        var message = await messageRepository.GetByIdAsync(messageId);
        
        if (message == null) {
            return Errors.ResourceNotFound("Message");
        }
        
        if (message.SenderUserId != requesterUserId) {
            return Errors.Forbidden("You do not have permission to delete this message.");
        }
       
        Result<ChannelMetadata> getChannelMetadataResult = 
            await conversationRepository.GetChannelMetadataFromConversationIdAsync(message.ConversationId);
        
        if (!getChannelMetadataResult.IsSuccess) {
            return getChannelMetadataResult.Error;
        }
        
        ChannelMetadata channelMetadata = getChannelMetadataResult.Value!;
        
        Result<MessagingPermissions> authResult = await channelAuthorizationService.GetMessagingPermissionsAsync(
            requesterUserId, 
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
        
        await unitOfWork.SaveChangesAsync();
        
        await mediator.Publish(new MessageDeletedNotification(channelMetadata.ChannelId, message.Id), CancellationToken.None);
        
        return Result.Success();
    }

    public async Task<Result<GetMessagesResponse>> GetTimelineMessagesAsync(
        Guid requesterUserId,
        Guid channelId,
        MessageLoadDirection? direction,
        Guid? cursorMessageId,
        int count,
        CancellationToken cancellationToken = default
    ) {
        Result<ChannelMetadata> getChannelMetadataResult = 
            await channelRepository.GetChannelMetadataFromChannelIdAsync(channelId, cancellationToken);
        
        if (!getChannelMetadataResult.IsSuccess) {
            return getChannelMetadataResult.Error;
        }
        
        ChannelMetadata channelMetadata = getChannelMetadataResult.Value!;
        
        Result<MessagingPermissions> authResult = await channelAuthorizationService.GetMessagingPermissionsAsync(
            requesterUserId, 
            channelMetadata.ChannelId, 
            channelMetadata.ChannelType
        );

        if (!authResult.IsSuccess) {
            return authResult.Error;
        }

        MessagingPermissions permissions = authResult.Value;

        if (!permissions.HasFlag(MessagingPermissions.ViewMessage)) {
            return Errors.Forbidden("You do not have permission to view this channel.");
        }
        
        Result<PagedTimelineMessageResult> getMessagesResult = await messageRepository.GetTimelineMessagesAsync(
            channelMetadata.ConversationId, 
            direction, 
            cursorMessageId,
            count,
            cancellationToken
        );

        if (!getMessagesResult.IsSuccess) {
            return getMessagesResult.Error;
        }
        
        var messagePage = getMessagesResult.Value!;
        
        // bail out early
        if (messagePage.Messages.Count == 0) {
            return Result<GetMessagesResponse>.Success(new([], [], messagePage.HasMoreBefore, messagePage.HasMoreAfter));
        }
        
        // group the messages
        var groups = new List<TimelineMessageBlockDto>();
        TimelineMessageBlockDto? currentGroup = null;

        foreach (TimelineMessageProjection message in getMessagesResult.Value!.Messages) {
            var element = new TimelineMessageDto(
                message.Id, 
                message.Body, 
                message.Attachments, 
                message.CreatedAt,
                message.ReplyTo
            );

            // if same sender as the last message, append to the current group
            if (currentGroup != null && currentGroup.SenderUserId == message.SenderUserId) {
                currentGroup.Messages.Add(element);
            } else {
                // else, create a new group and add it to the list
                currentGroup = new(message.SenderUserId, [element]);
                groups.Add(currentGroup);
            }
        }

        // must have at least 1 user
        List<UserBasicProfileDto> userProfiles =
            await userRepository.GetProfileSummariesAsync(
                [..groups
                    .Select(g => g.SenderUserId)
                    .Concat(
                        // include the sender user ids from replying
                        groups
                            .SelectMany(g => g.Messages)
                            .Where(m => m.ReplyTo != null)
                            .Select(m => m.ReplyTo!.SenderUserId)
                        )
                    .Distinct(),
                ],
                cancellationToken
            );
        
        return Result<GetMessagesResponse>.Success(new(
            groups, 
            userProfiles, 
            messagePage.HasMoreBefore, 
            messagePage.HasMoreAfter
        ));
    }

    public string GetAttachmentUrl(Guid attachmentId, bool useHttps) {
        return storageService.GetMessageAttachmentPreSignedUrl(attachmentId, useHttps);
    }
}