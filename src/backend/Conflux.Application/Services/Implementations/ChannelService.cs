using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Services.Implementations;

internal sealed class ChannelService(
    IChannelRepository channelRepository
) : IChannelService {
    public async Task<Result<DirectMessageChannelSummary>> GetDirectMessageChannelSummaryAsync(Guid userId, Guid channelId) {
        return await channelRepository.GetDirectMessageChannelSummaryAsync(userId, channelId);
    }

    public async Task<Result<ChannelResolutionResult>> GetOrCreateDirectMessageChannelAsync(Guid user1, Guid user2) {
        return await channelRepository.GetOrCreateDirectMessageChannelAsync(user1, user2);
    }
}