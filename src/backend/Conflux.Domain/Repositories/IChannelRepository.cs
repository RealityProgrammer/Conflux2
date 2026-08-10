using Conflux.Domain.Dto;

namespace Conflux.Domain.Repositories;

public interface IChannelRepository {
    Task<Result<ChannelMetadata>> GetChannelMetadataFromChannelIdAsync(
        Guid channelId, 
        CancellationToken cancellationToken = default
    );
    
    Task<Result<ChannelMetadata>> GetChannelMetadataFromConversationIdAsync(
        Guid conversationId, 
        CancellationToken cancellationToken = default
    );
    
    // Task<Result<DmConversationContext>> GetDmConversationContextFromChannelIdAsync(Guid userId, Guid channelId);
    // Task<Result<DmConversationContext>> GetDmConversationContextFromConversationIdAsync(Guid userId, Guid conversationId);
    
    Task<Result<DmChannelSummary>> GetDirectMessageChannelSummaryAsync(Guid userId, Guid channelId);
    Task<Result<ChannelResolutionResult>> GetOrCreateDirectMessageChannelAsync(Guid user1, Guid user2);
}