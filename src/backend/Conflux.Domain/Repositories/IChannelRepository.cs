using Conflux.Domain.Dto;

namespace Conflux.Domain.Repositories;

public interface IChannelRepository {
    Task<Result<ConversationPostingContext>> GetPostingContextFromChannelIdAsync(Guid userId, Guid channelId);
    Task<Result<ConversationPostingContext>> GetPostingContextFromConversationId(Guid userId, Guid conversationId);
    
    Task<Result<DirectMessageChannelSummary>> GetDirectMessageChannelSummaryAsync(Guid userId, Guid channelId);
    Task<Result<ChannelResolutionResult>> GetOrCreateDirectMessageChannelAsync(Guid user1, Guid user2);
}