namespace Conflux.Application.Dto;

public enum DiscoverFriendStatus {
    Stranger,
    OutcomingRequest,
    IncomingRequest,
    Friended,
}

public record DiscoverFriendElement(
    Guid UserId, 
    string UserName, 
    string DisplayName, 
    bool HasAvatar, 
    DiscoverFriendStatus Status
);