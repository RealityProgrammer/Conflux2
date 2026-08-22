using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Services.Implementations;

internal sealed class ServerTextChannelAuthorizationStrategy : IChannelAuthorizationStrategy {
    public ChannelType ChannelType => ChannelType.CommunityServerText;

    public Task<Result<MessagingPermissions>> GetMessagingPermissionsAsync(Guid userId, Guid channelId) {
        return Task.FromResult(Result<MessagingPermissions>.Success(MessagingPermissions.All));
    }
}