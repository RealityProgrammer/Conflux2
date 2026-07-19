namespace Conflux.Application.Requests;

public record SetupProfileRequest(
    Guid UserId,
    string UserName,
    string DisplayName,
    AvatarOperation AvatarOperation
);