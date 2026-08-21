using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Services.Implementations;

internal sealed class DmChannelAuthorizationStrategy(
    IChannelRepository channelRepository
) : IChannelAuthorizationStrategy {
    public ChannelType ChannelType => ChannelType.DirectMessage;

    public async Task<Result<MessagingPermissions>> GetMessagingPermissionsAsync(Guid userId, Guid channelId) {
        Result<DmChannelSummary> result = await channelRepository.GetDirectMessageChannelSummary(userId, channelId);

        if (!result.IsSuccess) {
            return Errors.ResourceNotFound("Channel");
        }

        return Result<MessagingPermissions>.Success(MessagingPermissions.All);
    }
}