using Conflux.Domain.Dto;

namespace Conflux.Domain.Repositories;

public interface IChannelRepository {
    Task<Result<ConversationPostingContext>> GetConversationPostingContext(Guid userId, Guid channelId);
    
    Task<Result<DirectMessageChannelSummary>> GetDirectMessageChannelSummaryAsync(Guid userId, Guid channelId);
    Task<Result<ChannelResolutionResult>> GetOrCreateDirectMessageChannelAsync(Guid user1, Guid user2);
}