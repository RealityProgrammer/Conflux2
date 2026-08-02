using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Interfaces.Implementations;

public class MessagingServiceOptions {
    public long MaxAttachmentSizeBytes { get; set; } = 10485760;
}

internal sealed class MessagingService(
    IUnitOfWork unitOfWork,
    IMessageRepository messageRepository,
    IChannelRepository channelRepository,
    IStorageService storageService,
    TimeProvider timeProvider
) : IMessagingService {
    public async Task<Result> SendMessageAsync(
        Guid senderUserId,
        Guid channelId,
        string? body, 
        IList<Guid> attachmentKeys,
        CancellationToken cancellationToken = default
    ) {
        var postingContext = 
            await channelRepository.GetConversationPostingContext(senderUserId, channelId);

        if (postingContext.Value == null) {
            return postingContext.Error;
        }
        
        Message message = new() {
            Body = body,
            AttachmentIds = [..attachmentKeys],
            SenderUserId = senderUserId,
            ConversationId = postingContext.Value.ConversationId,
            CreatedAt = timeProvider.GetUtcNow(),
        };

        messageRepository.Add(message);
        
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}