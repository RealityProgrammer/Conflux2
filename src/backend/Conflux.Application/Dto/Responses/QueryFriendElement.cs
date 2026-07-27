namespace Conflux.Application.Dto.Responses;

public sealed record QueryFriendElement(
    Guid UserId, 
    string UserName, 
    string DisplayName, 
    bool HasAvatar
);