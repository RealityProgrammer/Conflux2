using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IChannelAuthorizationStrategy {
    ChannelType ChannelType { get; }

    Task<bool> CanSendMessage(Guid userId, Guid channelId);
}