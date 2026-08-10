using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Services.Implementations;

internal sealed class ChannelAuthorizationService(
    IEnumerable<IChannelAuthorizationStrategy> strategies
) : IChannelAuthorizationService {
    public async Task<Result<MessagingPermissions>> GetMessagingPermissionsAsync(
        Guid userId, 
        Guid channelId, 
        ChannelType channelType
    ) {
        IChannelAuthorizationStrategy? strategy = 
            strategies.FirstOrDefault(s => s.ChannelType == channelType);

        if (strategy == null) {
            throw new NotSupportedException($"No channel authorization strategy found for channel type {channelType}.");
        }
        
        return await strategy.GetMessagingPermissionsAsync(userId, channelId);
    }
}