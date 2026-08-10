using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IChannelAuthorizationService {
    Task<Result<MessagingPermissions>> GetMessagingPermissionsAsync(Guid userId, Guid channelId, ChannelType channelType);
}