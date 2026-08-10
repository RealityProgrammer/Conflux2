using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IChannelAuthorizationStrategy {
    ChannelType ChannelType { get; }
    
    Task<Result<MessagingPermissions>> GetMessagingPermissionsAsync(Guid userId, Guid channelId);
}