namespace Conflux.Domain.Dto;

public sealed record PendingFriendRequestSummary(
    Guid UserId, 
    string UserName, 
    string DisplayName, 
    bool HasAvatar, 
    UserRelationshipStatus Status
);