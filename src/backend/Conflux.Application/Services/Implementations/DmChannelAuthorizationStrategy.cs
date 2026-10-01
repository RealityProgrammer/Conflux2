using Conflux.Domain.Enums;

namespace Conflux.Application.Services.Implementations;

internal sealed class DmChannelAuthorizationStrategy : IChannelAuthorizationStrategy {
    public ChannelType ChannelType => ChannelType.DirectMessage;

    public Task<bool> CanSendMessage(Guid userId, Guid channelId) {
        return Task.FromResult(true);
    }
}