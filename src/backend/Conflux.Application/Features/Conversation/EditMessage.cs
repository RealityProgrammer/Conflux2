using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet;
using Facet.Extensions;
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
    ILogger<EditMessageHandler> logger
) : ICommandHandler<EditMessageCommand, Result<EditedMessageDto>> {
    public async ValueTask<Result<EditedMessageDto>> Handle(EditMessageCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        Guid messageId = command.MessageId;
        Guid conversationId = command.ConversationId;
        
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
        
        // validate conversation authorization.
        if (!await conversationAuthorizeService.CanEditMessage(userId, command.ConversationId, cancellationToken)) {
            return Errors.Forbidden("User is not allowed to edit message in this conversation.");
        }
        
        // ensure only message owner can edit the message.
        if (message.SenderUserId != userId) {
            return Errors.Forbidden("User is not allowed to edit other user message.");
        }
        
        // ensure all remove attachment ids actually belong to this message
        var currentAttachmentIds = message.Attachments.Select(a => a.Id).ToHashSet();
        if (command.RemoveAttachmentIds.Any(id => !currentAttachmentIds.Contains(id))) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(EditMessageCommand.RemoveAttachmentIds)] = [
                    "One or more attachments to remove do not belong to this message.",
                ],
            });
        }
        
        // ensure final attachments is less than or equal to maximum allowance (4).
        int finalAttachmentsCount = message.Attachments.Count - command.RemoveAttachmentIds.Count + command.AddAttachments.Count;
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
        
        // upload attachments first if there is any
        AttachmentUploadResult[] newAttachmentsUploadResults = [];
        
        try {
            if (command.AddAttachments.Count > 0) {
                var uploadResult = await messageMediaService.UploadAttachments(command.AddAttachments, cancellationToken);
                
                if (!uploadResult.IsSuccess) {
                    return Errors.OperationFailure("upload new attachments");
                }
                
                newAttachmentsUploadResults = uploadResult.Value!;
            }

            if (command.Body.HasValue) {
                message.Body = command.Body.Value;
            }
            
            message.UpdatedAt = timeProvider.GetUtcNow();
            
            // remove attachments from database
            if (command.RemoveAttachmentIds.Count > 0) {
                foreach (var removeAttachmentId in command.RemoveAttachmentIds) {
                    for (int attachmentIndex = 0; attachmentIndex < message.Attachments.Count; attachmentIndex++) {
                        if (message.Attachments[attachmentIndex].Id == removeAttachmentId) {
                            message.Attachments.RemoveAt(attachmentIndex);
                            break;
                        }
                    }
                }
            }

            // add new MediaItem entity to database
            if (command.AddAttachments.Count > 0) {
                foreach ((int index, var uploadResult) in newAttachmentsUploadResults.Index()) {
                    var mediaItem = new MediaItem {
                        Id = uploadResult.Id,
                        Type = MediaItemType.MessageAttachment,
                        FileName = uploadResult.FileName,
                        ContentType = uploadResult.Format.MediaType,
                        Version = 0,
                        MessageId = message.Id,
                        Order = (short)index,
                    };

                    message.Attachments.Add(mediaItem);
                    unitOfWork.MarkAsAdded(mediaItem);
                }
            }

            await unitOfWork.SaveChangesAsync(cancellationToken);

            // delete removed files in object storage.
            if (command.RemoveAttachmentIds.Count > 0) {
                await messageMediaService.DeleteAttachments(command.RemoveAttachmentIds, CancellationToken.None);
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
            new MessageEditedNotification(command.ConversationId, message.Id, dto), 
            CancellationToken.None
        );
        
        return Result<EditedMessageDto>.Success(dto);
    }
}