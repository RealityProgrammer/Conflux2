using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet;
using Facet.Extensions;
using Markdig;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics.CodeAnalysis;

namespace Conflux.Application.Features.Conversation;

public sealed record EditMessageCommand(
    Guid ConversationId,
    Guid MessageId, 
    Optional<string?> Body,
    IReadOnlyCollection<Guid> RemoveAttachmentIds,
    IReadOnlyCollection<UploadFile> AddAttachments
) : ICommand<Result<EditedMessageDto>>, IConversationCommand;

[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)]
public sealed class EditMessageCommandValidator : AbstractValidator<EditMessageCommand> {
    public EditMessageCommandValidator() {
        RuleFor(c => c.Body)
            .Must(b => !b.HasValue || b.Value is not { Length: > 4000 })
            .WithMessage(string.Format(ValidationMessages.StringMaxLength_Format, 4000));
        
        RuleFor(c => c.AddAttachments)
            .Must(files => files is not { Count: > 4 })
            .WithMessage(string.Format(ValidationMessages.MessageMaximumAttachmentsCount, 4));
    }
}

public sealed record MessageEditedNotification(Guid ConversationId, Guid MessageId, EditedMessageDto Message) : INotification;

public sealed class EditMessageHandler(
    ICurrentUserService currentUserService,
    IMessageRepository messageRepository,
    TimeProvider timeProvider,
    IConversationAuthorizeService conversationAuthorizeService,
    IMessageMediaService messageMediaService,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    IEmojiValidationService emojiValidationService,
    ILogger<EditMessageHandler> logger
) : ICommandHandler<EditMessageCommand, Result<EditedMessageDto>> {
    public async ValueTask<Result<EditedMessageDto>> Handle(EditMessageCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        Guid conversationId = command.ConversationId;
        
        // validate conversation authorization.
        if (!await conversationAuthorizeService.CanEditMessage(userId, conversationId, cancellationToken)) {
            return Errors.Forbidden("User is not allowed to edit message in this conversation.");
        }

        Guid messageId = command.MessageId;
        
        var message = await messageRepository
            .AsQueryable()
            .Include(m => m.Attachments.OrderBy(a => a.Order))
            .Where(m => m.Id == messageId && m.ConversationId == conversationId)
            .FirstOrDefaultAsync(cancellationToken);
        
        if (message == null) {
            return Errors.ResourceNotFound("Message", [
                new(nameof(Message.Id), messageId.ToString()),
                new(nameof(Message.ConversationId), conversationId.ToString()),
            ]);
        }
        
        // ensure only message owner can edit the message.
        if (message.SenderUserId != userId) {
            return Errors.Forbidden("User is not allowed to edit other user message.");
        }
        
        // ensure all remove attachment ids actually belong to this message
        var removeAttachmentIds = command.RemoveAttachmentIds;
        
        var currentAttachmentIds = message.Attachments.Select(a => a.Id).ToHashSet();
        if (removeAttachmentIds.Any(id => !currentAttachmentIds.Contains(id))) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(EditMessageCommand.RemoveAttachmentIds)] = [
                    "One or more attachments to remove do not belong to this message.",
                ],
            });
        }
        
        // ensure final attachments is less than or equal to maximum allowance (4).
        var addAttachments = command.AddAttachments;
        
        int finalAttachmentsCount = message.Attachments.Count - removeAttachmentIds.Count + addAttachments.Count;
        if (finalAttachmentsCount > 4) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(EditMessageCommand.AddAttachments)] = [
                    "A message cannot have more than 4 attachments in total.",
                ],
            });
        }
        
        // if final attachments count is 0 and post-update message has no body, return bad request.
        if (finalAttachmentsCount == 0 && (command.Body is { HasValue: true, Value: null } || !command.Body.HasValue && message.Body == null)) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(Message.Body)] = [
                    "Message post-edit will have no content.",
                ],
                [nameof(Message.Attachments)] = [
                    "Message post-edit will have no content.",
                ],
            });
        }
        
        // validate emoji if has body
        if (command.Body is { HasValue: true, Value: { } body } && !string.IsNullOrWhiteSpace(body)) {
            var markdownDocument = Markdown.Parse(body);

            var error = await emojiValidationService.ValidateMessageEmojis(markdownDocument, userId, cancellationToken);
            if (error != Error.None) {
                return error;
            }
        }
        
        // upload attachments first if there is any
        AttachmentUploadResult[] newAttachmentsUploadResults = [];
        
        try {
            if (addAttachments.Count > 0) {
                var uploadResult = await messageMediaService.UploadAttachments(addAttachments, cancellationToken);
                
                if (!uploadResult.IsSuccess) {
                    return Errors.OperationFailure("upload new attachments");
                }
                
                newAttachmentsUploadResults = uploadResult.Value!;
            }

            if (command.Body.HasValue) {
                message.Body = command.Body.Value?.Trim();
            }
            
            message.UpdatedAt = timeProvider.GetUtcNow();
            
            // remove attachments from database
            if (removeAttachmentIds.Count > 0) {
                foreach (var removeAttachmentId in removeAttachmentIds) {
                    for (int attachmentIndex = 0; attachmentIndex < message.Attachments.Count; attachmentIndex++) {
                        if (message.Attachments[attachmentIndex].Id == removeAttachmentId) {
                            message.Attachments.RemoveAt(attachmentIndex);
                            break;
                        }
                    }
                }
            }

            // re-ordering the remaining attachments.
            for (int i = 0; i < message.Attachments.Count; i++) {
                message.Attachments[i].Order = (short)i;
            }

            // add new MediaItem entity to database
            if (addAttachments.Count > 0) {
                foreach ((int index, var uploadResult) in newAttachmentsUploadResults.Index()) {
                    var mediaItem = new MediaItem {
                        Id = uploadResult.Id,
                        Type = MediaItemType.MessageAttachment,
                        FileName = uploadResult.FileName,
                        ContentType = uploadResult.Format.MediaType,
                        Version = 0,
                        MessageId = message.Id,
                        Order = (short)(message.Attachments.Count + index), // new attachments move to the last positions
                    };

                    message.Attachments.Add(mediaItem);
                    unitOfWork.MarkAsAdded(mediaItem);
                }
            }

            await unitOfWork.SaveChangesAsync(cancellationToken);

            // delete removed files in object storage.
            if (removeAttachmentIds.Count > 0) {
                await messageMediaService.DeleteAttachments(removeAttachmentIds, CancellationToken.None);
            }
        } catch (OperationCanceledException) {
            // compensate by delete uploaded media file
            if (newAttachmentsUploadResults.Length > 0) {
                await messageMediaService.DeleteAttachments([..newAttachmentsUploadResults.Select(a => a.Id)], CancellationToken.None);
            }
            
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while editing message {msgId}.", messageId);
            
            // compensate by delete uploaded media file
            if (newAttachmentsUploadResults.Length > 0) {
                await messageMediaService.DeleteAttachments([..newAttachmentsUploadResults.Select(a => a.Id)], CancellationToken.None);
            }
            
            return Errors.UnexpectedError();
        }

        EditedMessageDto dto = 
            new(message.Body, [.. message.Attachments.SelectFacets<MediaItem, MessageAttachmentDto>()]);

        await publisher.Publish(
            new MessageEditedNotification(conversationId, message.Id, dto), 
            CancellationToken.None
        );
        
        return Result<EditedMessageDto>.Success(dto);
    }
}
