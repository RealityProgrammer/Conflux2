using Conflux.Domain.Dto;
using Conflux.Domain.Enums;

namespace Conflux.Application.Dto;

public enum FriendSearchStatus {
    Success = 0,
    NoUser = 1,
    DisallowSelf = 2,
}

public sealed record FriendSearchResult(
    UserIdentityProfileDto UserProfile, 
    UserRelationshipStatus RelationshipStatus,
    Guid? FriendRequestId
);

public sealed record FriendSearchResponse(
    FriendSearchStatus Status, 
    FriendSearchResult? Result
);

