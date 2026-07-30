namespace Conflux.Domain.Dto;

public sealed record FriendSummary(
    Guid UserId, 
    string UserName, 
    string DisplayName, 
    bool HasAvatar
);