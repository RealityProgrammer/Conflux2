using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Interfaces.Implementations;

public class MessagingServiceOptions {
    public long MaxAttachmentSizeBytes { get; set; } = 10485760;
}

internal sealed class MessageService(
    IUnitOfWork unitOfWork,
    IMessageRepository messageRepository,
    IChannelRepository channelRepository,
    TimeProvider timeProvider
) : IMessageService {
    public async Task<Result<MessageDto>> SendMessageAsync(
        Guid senderUserId,
        Guid channelId,
        string? body, 
        IList<Attachment> attachments,
        CancellationToken cancellationToken = default
    ) {
        var postingContext = 
            await channelRepository.GetConversationPostingContext(senderUserId, channelId);

        if (postingContext.Value == null) {
            return postingContext.Error;
        }
        
        Message message = new() {
            Body = body,
            Attachments = [..attachments],
            SenderUserId = senderUserId,
            ConversationId = postingContext.Value.ConversationId,
            CreatedAt = timeProvider.GetUtcNow(),
        };

        messageRepository.Add(message);
        
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<MessageDto>.Success(new(
            message.Id,
            senderUserId, 
            body, 
            message.Attachments,
            message.CreatedAt
        ));
    }

    public async Task<Result<GetMessagesResult>> GetMessagesAsync(
        Guid channelId,
        MessageLoadDirection? direction,
        Guid? cursorMessageId,
        int count,
        CancellationToken cancellationToken = default
    ) {
        var result = 
            await channelRepository.GetConversationPostingContext(Guid.Empty, channelId);

        if (result.IsSuccess) {
            var postingContext = result.Value;
            
            return await messageRepository.GetMessagesAsync(
                postingContext!.ConversationId, 
                direction, 
                cursorMessageId,
                count,
                cancellationToken
            );
        }

        return result.Error;
    }
}