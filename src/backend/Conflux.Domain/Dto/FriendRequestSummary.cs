using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record FriendRequestSummary(
    Guid Id, 
    FriendRequestStatus Status, 
    UserBasicProfileDto Sender,
    UserBasicProfileDto Receiver
);