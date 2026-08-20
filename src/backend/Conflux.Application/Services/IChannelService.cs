using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Services;

public interface IChannelService {
    Task<Result<DmChannelSummary>> GetDmChannelSummary(Guid userId, Guid channelId);
    Task<Result<ChannelResolutionResult>> GetOrCreateDmChannel(Guid user1, Guid user2);
    Task<Result<Guid>> CreateServerTextChannel(Guid serverId, string name, Guid? categoryId);
    Task<Result<Guid>> CreateServerVoiceChannel(Guid serverId, string name, Guid? categoryId);
    Task<PaginatedResult<DmConversationListItemDto>> GetUserConversations(Guid userId, int offset, int count);
}