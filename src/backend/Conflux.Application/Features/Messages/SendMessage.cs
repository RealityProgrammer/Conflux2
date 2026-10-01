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
    Guid ConversationId,
    string? Body,
    IReadOnlyList<UploadFile> Attachments,
    Guid? ReplyToId
) : ICommand<Result<TimelineMessageDto>>;

public sealed record MessageReceivedNotification(Guid ConversationId, TimelineMessageDto Message) : INotification;

public sealed record UpdateDmConversationListNotification(
    Guid SenderUserId,
    Guid ChannelId, 
    Guid ReceiverUserId
) : INotification;

public sealed class SendMessageHandler(
    IMessageRepository messageRepository,
    IConversationRepository conversationRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    TimeProvider timeProvider,
    IMessageMediaService messageMediaService
) : ICommandHandler<SendMessageCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(SendMessageCommand command, CancellationToken cancellationToken) {
        Guid conversationId = command.ConversationId;
        Guid senderUserId = command.SenderUserId;

        ConversationType? conversationType = await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == command.ConversationId)
            .Select(c => c.Type)
            .Cast<ConversationType?>()
            .FirstOrDefaultAsync(cancellationToken);

        if (conversationType == null) {
            return Errors.ResourceNotFound("Conversation", [new("Id", conversationId.ToString())]);
        }

        var utcNow = timeProvider.GetUtcNow();
        
        // upload attachments
        Attachment[] attachments = [];
        if (command.Attachments.Count > 0) {
            Result<Attachment[]> attachmentResults = await UploadAttachments(command.Attachments, cancellationToken);

            if (!attachmentResults.IsSuccess) {
                return attachmentResults.Error;
            }

            attachments = attachmentResults.Value!;
        }

        Message message = new() {
            Body = command.Body,
            Attachments = attachments,
            SenderUserId = senderUserId,
            ConversationId = conversationId,
            ReplyToId = command.ReplyToId,
            CreatedAt = utcNow,
        };
        
        await unitOfWork.BeginTransactionAsync(cancellationToken);

        try {
            messageRepository.Add(message);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            
            await conversationRepository.UpdateLatestMessageTime(conversationId, utcNow);
            
            // load the reply message into memory so that dto the message got the reply to convert to dto
            if (command.ReplyToId.HasValue) {
                await messageRepository
                    .AsQueryable()
                    .FirstOrDefaultAsync(m => m.Id == command.ReplyToId.Value, cancellationToken);
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
        await mediator.Publish(new MessageReceivedNotification(conversationId, dto), CancellationToken.None);
        
        // if the channel type is DM, emit the notification to update the conversation list on the sidebar
        if (conversationType == ConversationType.Direct) {
            // var dmSummary = 
            //     (await channelRepository.GetDmChannelSummary(senderUserId, channelId)).Value!;
            //
            // await mediator.Publish(new UpdateDmConversationListNotification(
            //     senderUserId,
            //     channelMetadata.ChannelId,
            //     dmSummary.PeerProfile.Id
            // ), CancellationToken.None);
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