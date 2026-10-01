using Conflux.Domain.Enums;

namespace Conflux.Application.Services.Implementations;

internal sealed class ServerVoiceChannelAuthorizationStrategy : IChannelAuthorizationStrategy {
    public ChannelType ChannelType => ChannelType.Text;

    public Task<bool> CanSendMessage(Guid userId, Guid channelId) {
        return Task.FromResult(true);
    }
}