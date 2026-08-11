using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Services;

public interface IChannelService {
    Task<Result<DmChannelSummary>> GetDmChannelSummaryAsync(Guid userId, Guid channelId);
    Task<Result<ChannelResolutionResult>> GetOrCreateDmChannelAsync(Guid user1, Guid user2);

    Task<PaginatedResult<DmConversationListItemDto>> GetUserConversationsAsync(Guid userId, int offset, int count);
}