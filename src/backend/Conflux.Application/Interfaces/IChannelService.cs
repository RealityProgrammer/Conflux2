using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Interfaces;

public interface IChannelService {
    Task<Result<DirectMessageChannelSummary>> GetDirectMessageChannelSummaryAsync(Guid userId, Guid channelId);
    Task<Result<ChannelResolutionResult>> GetOrCreateDirectMessageChannelAsync(Guid user1, Guid user2);
}