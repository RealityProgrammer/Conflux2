using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record DiscoverFriendSummary(
    Guid UserId, 
    string UserName, 
    string DisplayName, 
    bool HasAvatar, 
    UserRelationshipStatus Status
);