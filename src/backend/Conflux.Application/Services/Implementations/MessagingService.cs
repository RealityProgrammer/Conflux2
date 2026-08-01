using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Services.Implementations;

public class MessagingServiceOptions {
    public int MaxAttachmentsCount { get; set; } = 4;
    public long MaxAttachmentSizeBytes { get; set; } = 10485760;
}

internal sealed class MessagingService(
    IMessagingRepository messagingRepository,
    IChannelRepository channelRepository,
    IStorageService storageService
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
        
        Result result = await messagingRepository.CreateMessageAsync(
            senderUserId,
            postingContext.Value.ConversationId,
            body,
            [.. attachmentKeys], 
            cancellationToken
        );

        if (!result.IsSuccess) {
            return result;
        }
        
        // TODO: Broadcast to others.
        return result;
    }
}