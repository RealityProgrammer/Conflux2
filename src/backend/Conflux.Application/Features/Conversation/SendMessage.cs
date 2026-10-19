using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record SendMessageCommand(
    Guid ConversationId,
    string? Body,
    IReadOnlyList<UploadFile> Attachments,
    Guid? ReplyToId
) : ICommand<Result<TimelineMessageDto>>;

public sealed record MessageReceivedNotification(
    Guid ConversationId, 
    TimelineMessageDto Message
) : INotification;

public sealed class SendMessageHandler(
    ICurrentUserService currentUserService,
    IUserRepository userRepository,
    IMessageRepository messageRepository,
    IConversationRepository conversationRepository,
    IConversationParticipantsProvider conversationParticipantsProvider,
    IConversationAuthorizeService conversationAuthorizeService,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    TimeProvider timeProvider,
    IMessageMediaService messageMediaService
) : ICommandHandler<SendMessageCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(SendMessageCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } senderUserId) {
            return Errors.InvalidIdentifier();
        }
        
        Guid conversationId = command.ConversationId;
        
        Domain.Entities.Conversation? conversation = await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == conversationId)
            .FirstOrDefaultAsync(cancellationToken);

        if (conversation == null) {
            return Errors.ResourceNotFound("Conversation", [new("Id", conversationId.ToString())]);
        }

        if (!await conversationAuthorizeService.CanSendMessage(senderUserId, conversationId, cancellationToken)) {
            return Errors.Forbidden("User is not allowed to send message in this conversation.");
        }

        var utcNow = timeProvider.GetUtcNow();
        
        // upload attachments
        MediaItem[] attachments = [];
        if (command.Attachments.Count > 0) {
            Result<MediaItem[]> attachmentResults = await UploadAttachments(command.Attachments, cancellationToken);

            if (!attachmentResults.IsSuccess) {
                return attachmentResults.Error;
            }

            attachments = attachmentResults.Value!;
        }

        Message message = new() {
            Body = command.Body,
            Attachments = attachments,
            SenderUserId = senderUserId,
            Conversation = conversation,
            ReplyToId = command.ReplyToId,
            CreatedAt = utcNow,
        };
        
        await unitOfWork.BeginTransactionAsync(cancellationToken);

        try {
            messageRepository.Add(message);
            conversation.LatestMessageAt = utcNow;
            
            await unitOfWork.SaveChangesAsync(cancellationToken);
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

        TimelineMessageDto dto = new(message) {
            ReplyTo = await messageRepository
                .AsQueryable()
                .Where(m => m.Id == message.ReplyToId)
                .SelectFacet<TimelineMessageReplyDto>()
                .SingleOrDefaultAsync(CancellationToken.None),
            
            Sender = await userRepository
                .AsQueryable()
                .Where(u => u.Id == message.SenderUserId)
                .SelectFacet<TimelineMessageSenderDto>()
                .FirstOrDefaultAsync(CancellationToken.None),
        };

        await publisher.Publish(
            new MessageReceivedNotification(conversationId, dto), 
            CancellationToken.None
        );

        if (conversation.Type == ConversationType.Direct) {
            IReadOnlyCollection<Guid> directConversationParticipantIds = 
                await conversationParticipantsProvider.GetDirectConversationParticipantIds(conversationId, CancellationToken.None);
            
            await publisher.Publish(
                new DirectConversationUpdatedNotification(conversationId, directConversationParticipantIds), 
                CancellationToken.None
            );
        }

        return Result<TimelineMessageDto>.Success(dto);
    }

    private async Task<Result<MediaItem[]>> UploadAttachments(
        IReadOnlyList<UploadFile> attachments, 
        CancellationToken cancellationToken
    ) {
        MediaItem?[] finalAttachments = new MediaItem?[attachments.Count];
        
        for (int i = 0; i < attachments.Count; i++) {
            var attachment = attachments[i];
            
            try {
                Result<MediaItem> uploaded = 
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

        return Result<MediaItem[]>.Success(finalAttachments!);
    }

    private async ValueTask DeleteUploadedAttachments(IEnumerable<MediaItem?> attachments) {
        foreach (var attachment in attachments) {
            if (attachment != null && attachment.Id != Guid.Empty) {
                await messageMediaService.DeleteAttachment(attachment.Id, CancellationToken.None);
            }
        }
    }
}