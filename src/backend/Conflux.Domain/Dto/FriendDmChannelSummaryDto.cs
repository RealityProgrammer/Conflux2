using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record FriendDmChannelSummaryDto(
    Guid FriendRequestId,
    FriendRequestStatus FriendStatus,
    Guid? ChannelId
);
