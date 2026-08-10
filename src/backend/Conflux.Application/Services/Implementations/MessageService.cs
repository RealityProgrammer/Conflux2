using Conflux.Application.Dto.Notifications;
using Conflux.Application.Dto.Responses;
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
        Result<ConversationPostingContext> getPostingContextResult = 
            await channelRepository.GetPostingContextFromChannelIdAsync(senderUserId, channelId);

        if (!getPostingContextResult.IsSuccess) {
            return getPostingContextResult.Error;
        }

        ConversationPostingContext postingContext = getPostingContextResult.Value!;

        Result accessibilityResult = ValidateConversationAccessibility(postingContext, senderUserId);

        if (!accessibilityResult.IsSuccess) {
            return accessibilityResult.Error;
        }
        
        // upload attachments
        Attachment[] attachments = attachmentStreams.Count == 0 ? [] : new Attachment[attachmentStreams.Count];

        for (int i = 0; i < attachments.Length; i++) {
            var stream = attachmentStreams[i];
            
            // validate the content
            if (fileFormatInspector.DetermineFileFormat(stream) is not Image imageFormat) {
                await DeleteUploadedAttachments();

                return Errors.ValidationErrorsOccured(new() {
                    [nameof(attachmentStreams)] = [
                        "One of the attachments doesn't have image format.",
                    ],
                });
            }

            if (imageFormat.MediaType is not "image/jpeg" and not "image/png") {
                await DeleteUploadedAttachments();

                return Errors.ValidationErrorsOccured(new() {
                    [nameof(attachmentStreams)] = [
                        "One of the attachments doesn't have the supported image format.",
                    ],
                });
            }
            
            stream.Position = 0;

            try {
                Result<Guid> uploadResult =
                    await storageService.UploadMessageAttachmentAsync(new(stream, imageFormat.MediaType), cancellationToken);

                if (uploadResult.IsSuccess) {
                    attachments[i] = new() {
                        Id = uploadResult.Value,
                        Type = imageFormat.MediaType,
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
            Attachments = attachments,
            SenderUserId = senderUserId,
            ConversationId = postingContext.ConversationId,
            ReplyToId = replyToId,
            CreatedAt = timeProvider.GetUtcNow(),
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
                if (attachment.Id != Guid.Empty) {
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
       
        Result<ConversationPostingContext> getPostingContextResult = 
            await channelRepository.GetPostingContextFromConversationId(requesterUserId, message.ConversationId);

        if (!getPostingContextResult.IsSuccess) {
            return getPostingContextResult.Error;
        }

        ConversationPostingContext postingContext = getPostingContextResult.Value!;

        Result accessibilityResult = ValidateConversationAccessibility(postingContext, requesterUserId);

        if (!accessibilityResult.IsSuccess) {
            return accessibilityResult.Error;
        }
        
        if (message.SenderUserId != requesterUserId) {
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
        
        await mediator.Publish(new MessageEditedNotification(postingContext.ChannelId, dto), CancellationToken.None);
        
        return Result<MessageDto>.Success(dto);
    }

    public async Task<Result> DeleteMessageAsync(Guid messageId, Guid requesterUserId) {
        var message = await messageRepository.GetByIdAsync(messageId);
        
        if (message == null) {
            return Errors.ResourceNotFound("Message");
        }
        
        Result<ConversationPostingContext> getPostingContextResult = 
            await channelRepository.GetPostingContextFromConversationId(requesterUserId, message.ConversationId);

        if (!getPostingContextResult.IsSuccess) {
            return getPostingContextResult.Error;
        }

        ConversationPostingContext postingContext = getPostingContextResult.Value!;

        Result accessibilityResult = ValidateConversationAccessibility(postingContext, requesterUserId);

        if (!accessibilityResult.IsSuccess) {
            return accessibilityResult.Error;
        }
        
        if (message.SenderUserId != requesterUserId) {
            return Errors.Forbidden("You do not have permission to delete this message.");
        }

        if (message.DeletedAt != null) {
            return Result.Success();
        }

        message.DeletedAt = timeProvider.GetUtcNow();
        
        await unitOfWork.SaveChangesAsync();
        
        await mediator.Publish(new MessageDeletedNotification(postingContext.ChannelId, message.Id), CancellationToken.None);
        
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
        var result = 
            await channelRepository.GetPostingContextFromChannelIdAsync(requesterUserId, channelId);

        if (!result.IsSuccess) {
            return result.Error;
        }
        
        // validate ownership.
        ConversationPostingContext postingContext = result.Value!;

        switch (postingContext.ChannelType) {
            case ChannelType.DirectMessage:
                // check if user can access the direct message
                var dmContext = postingContext.DmContext!;

                if (dmContext.SenderUserId != requesterUserId && dmContext.ReceiverUserId != requesterUserId) {
                    return Errors.Forbidden("You are not associated with the conversation.");
                }
                break;
            
            // TODO: Server validate.
        }
        
        Result<PagedTimelineMessageResult> getMessagesResult = await messageRepository.GetTimelineMessagesAsync(
            postingContext.ConversationId, 
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

    private Result ValidateConversationAccessibility(ConversationPostingContext postingContext, Guid requesterUserId) {
        switch (postingContext.ChannelType) {
            case ChannelType.DirectMessage:
                // check if user can access the direct message
                var dmContext = postingContext.DmContext!;

                if (dmContext.SenderUserId != requesterUserId && dmContext.ReceiverUserId != requesterUserId) {
                    return Errors.Forbidden("You are not associated with the conversation.");
                }

                return Result.Success();
            
            default:
                return Errors.Forbidden("Unknown conversation type.");
        }
    }
}