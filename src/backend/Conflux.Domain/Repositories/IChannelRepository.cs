using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IChannelRepository {
    void Add(Channel channel);
    
    Task<Result<ChannelMetadata>> GetChannelMetadataFromChannelIdAsync(
        Guid channelId, 
        CancellationToken cancellationToken = default
    );
    
    Task<Result<DmChannelSummary>> GetDirectMessageChannelSummaryAsync(Guid userId, Guid channelId);

    Task<FriendDmChannelSummaryDto?> GetFriendDmChannelSummary(Guid userId1, Guid userId2);

    Task<PaginatedResult<DmConversationListItemDto>> GetUserConversationsAsync(Guid userId, int offset, int count);

    Task<Guid> GetChannelIdFromFriendRequestId(Guid friendRequestId, CancellationToken cancellationToken = default);
}