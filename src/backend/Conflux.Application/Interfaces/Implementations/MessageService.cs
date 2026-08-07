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

namespace Conflux.Application.Interfaces.Implementations;

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
        CancellationToken cancellationToken = default
    ) {
        var postingContext = 
            await channelRepository.GetPostingContextFromChannelIdAsync(senderUserId, channelId);

        if (postingContext.Value == null) {
            return postingContext.Error;
        }
        
        // TODO: Validate permissions.
        
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
            ConversationId = postingContext.Value.ConversationId,
            CreatedAt = timeProvider.GetUtcNow(),
        };

        messageRepository.Add(message);

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);

            MessageDto dto = new(
                message.Id,
                senderUserId,
                body,
                message.Attachments,
                message.CreatedAt
            );

            await mediator.Publish(new MessageReceivedNotification(channelId, dto), CancellationToken.None);

            return Result<MessageDto>.Success(dto);
        } catch (OperationCanceledException) {
            await DeleteUploadedAttachments();
            throw;
        }

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
        
        if (message.SenderUserId != requesterUserId) {
            return Errors.Forbidden("You do not have permission to edit this message.");
        }
        
        // get the channel id from the conversation id from message's conversation id.
        Result<ConversationPostingContext> postingContext =
            await channelRepository.GetPostingContextFromConversationId(requesterUserId, message.ConversationId);

        if (!postingContext.IsSuccess) {
            logger.LogError("Failed to edit message due to cannot retrieve posting context from conversation with id {id}.", message.ConversationId);
            
            return Errors.OperationFailure("edit message");
        }
        
        // if body is not changed, return success instantly.
        if (message.Body == newBody) {
            return Result<MessageDto>.Success(new(
                message.Id, 
                message.SenderUserId,
                newBody,
                message.Attachments,
                message.CreatedAt
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
            message.CreatedAt
        );
        
        await mediator.Publish(new MessageEditedNotification(postingContext.Value!.ChannelId, dto), CancellationToken.None);
        
        return Result<MessageDto>.Success(dto);
    }

    public async Task<Result<GetMessagesResponse>> GetMessagesAsync(
        Guid channelId,
        MessageLoadDirection? direction,
        Guid? cursorMessageId,
        int count,
        CancellationToken cancellationToken = default
    ) {
        var result = 
            await channelRepository.GetPostingContextFromChannelIdAsync(Guid.Empty, channelId);

        if (result.IsSuccess) {
            var postingContext = result.Value;
            
            Result<PagedMessageResult> getMessagesResult = await messageRepository.GetMessagesAsync(
                postingContext!.ConversationId, 
                direction, 
                cursorMessageId,
                count,
                cancellationToken
            );
            
            if (getMessagesResult.IsSuccess) {
                var messagePage = getMessagesResult.Value!;
                
                // bail out early
                if (messagePage.Messages.Count == 0) {
                    return Result<GetMessagesResponse>.Success(new([], [], messagePage.HasMoreBefore, messagePage.HasMoreAfter));
                }
                
                // group the messages
                var groups = new List<MessageGroup>();
                MessageGroup? currentGroup = null;

                foreach (MessageDto message in getMessagesResult.Value!.Messages) {
                    var element = new MessageElement(message.Id, message.Body, message.Attachments, message.CreatedAt);

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
                        [..groups.Select(g => g.SenderUserId).Distinct()], 
                        cancellationToken
                    );
                
                return Result<GetMessagesResponse>.Success(new(
                    groups, 
                    userProfiles, 
                    messagePage.HasMoreBefore, 
                    messagePage.HasMoreAfter
                ));
            }
        }

        return result.Error;
    }

    public string GetAttachmentUrl(Guid attachmentId, bool useHttps) {
        return storageService.GetMessageAttachmentPreSignedUrl(attachmentId, useHttps);
    }
}