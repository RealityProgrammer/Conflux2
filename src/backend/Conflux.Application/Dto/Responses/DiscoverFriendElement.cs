namespace Conflux.Application.Dto.Responses;

public sealed record DiscoverFriendElement(
    Guid UserId, 
    string UserName, 
    string DisplayName, 
    bool HasAvatar, 
    UserRelationshipStatus Status
);