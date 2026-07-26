namespace Conflux.Application.Dto.Requests;

public sealed record SetupProfileRequest(
    Guid UserId,
    string UserName,
    string DisplayName,
    AvatarOperation AvatarOperation
);