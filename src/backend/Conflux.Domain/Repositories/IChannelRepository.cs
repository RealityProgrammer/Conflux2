using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IChannelRepository {
    void Add(Channel channel);
    
    Task<Result<ChannelMetadata>> GetChannelMetadataFromChannelId(
        Guid channelId, 
        CancellationToken cancellationToken = default
    );
    
    Task<Result<DmChannelSummary>> GetDirectMessageChannelSummary(Guid userId, Guid channelId);

    Task<FriendDmChannelSummaryDto?> GetFriendDmChannelSummary(Guid userId1, Guid userId2);

    Task<PaginatedResult<DmConversationListItemDto>> GetUserConversations(Guid userId, int offset, int count);

    Task<Guid> GetChannelIdFromFriendRequestId(Guid friendRequestId, CancellationToken cancellationToken = default);
}