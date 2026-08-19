using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record DmChannelSummary(
    Guid ChannelId,
    UserIdentityProfileDto OtherUser,
    FriendRequestStatus FriendRequestStatus
);