using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IChannelRepository : IWriteRepository<Channel> {
    Task<Result<ChannelMetadataDto>> GetChannelMetadataFromChannelId(
        Guid channelId, 
        CancellationToken cancellationToken = default
    );
    
    Task<Result<DmChannelSummary>> GetDmChannelSummary(Guid userId, Guid channelId);

    Task<FriendDmChannelSummaryDto?> GetFriendDmChannelSummary(Guid userId1, Guid userId2);

    Task<PaginatedResult<DmConversationListItemDto>> GetUserConversations(Guid userId, int offset, int count);

    Task<Guid> GetChannelIdFromFriendRequestId(Guid friendRequestId, CancellationToken cancellationToken = default);
    
    Task<bool> Delete(Guid serverId, Guid channelId, CancellationToken cancellationToken = default);
}