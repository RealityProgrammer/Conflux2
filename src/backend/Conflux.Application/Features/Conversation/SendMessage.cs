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
) : ICommand<Result<TimelineMessageDto>>, IConversationCommand;

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
    IMessageMediaService messageMediaService,
    ILogger<SendMessageHandler> logger
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

        // create and update
        Message message = new() {
            Body = command.Body,
            SenderUserId = senderUserId,
            Conversation = conversation,
            ReplyToId = command.ReplyToId,
            CreatedAt = utcNow,
        };
        
        messageRepository.Add(message);
        conversation.LatestMessageAt = utcNow;
        
        // upload attachments
        var uploadResults = await messageMediaService.UploadAttachments(command.Attachments, cancellationToken);

        if (!uploadResults.IsSuccess) {
            return uploadResults.Error;
        }

        AttachmentUploadResult[] attachmentUploadResults = uploadResults.Value!;

        // add MediaItem objects
        MediaItem[] mediaItems = new MediaItem[attachmentUploadResults.Length];
        for (int i = 0; i < attachmentUploadResults.Length; i++) {
            mediaItems[i] = new() {
                Id = attachmentUploadResults[i].Id,
                FileName = attachmentUploadResults[i].FileName,
                ContentType = attachmentUploadResults[i].Format.MediaType,
                Version = 0,
                Type = MediaItemType.MessageAttachment,
            };
        }
        
        message.Attachments = mediaItems;
        
        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (OperationCanceledException) {
            await messageMediaService.DeleteAttachments([..attachmentUploadResults.Select(a => a.Id)], cancellationToken);
            throw;
        } catch (Exception e) {
            await messageMediaService.DeleteAttachments([..attachmentUploadResults.Select(a => a.Id)], cancellationToken);
            logger.LogError(e, "Exception thrown while saving message to database.");
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
}