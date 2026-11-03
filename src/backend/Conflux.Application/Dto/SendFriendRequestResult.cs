using Conflux.Domain.Enums;

namespace Conflux.Application.Dto;

public sealed record SendFriendRequestResult(
    UserRelationshipStatus RelationshipStatus,
    Guid FriendRequestId
);