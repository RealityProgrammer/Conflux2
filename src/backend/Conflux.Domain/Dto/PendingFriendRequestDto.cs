using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record PendingFriendRequestDto(
    Guid UserId, 
    string UserName, 
    string DisplayName, 
    bool HasAvatar, 
    UserRelationshipStatus Status
);