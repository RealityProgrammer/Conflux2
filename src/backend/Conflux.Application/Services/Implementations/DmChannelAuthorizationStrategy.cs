using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;

namespace Conflux.Application.Services.Implementations;

internal sealed class DmChannelAuthorizationStrategy(
    IChannelService channelService
) : IChannelAuthorizationStrategy {
    public ChannelType ChannelType => ChannelType.DirectMessage;

    public async Task<Result<MessagingPermissions>> GetMessagingPermissionsAsync(Guid userId, Guid channelId) {
        Result<DmChannelSummary> result = await channelService.GetDmChannelSummaryAsync(userId, channelId);

        if (!result.IsSuccess) {
            return Errors.ResourceNotFound("Channel");
        }

        return Result<MessagingPermissions>.Success(MessagingPermissions.All);
    }
}