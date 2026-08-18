namespace Conflux.Application.Dto;

public sealed record SetupProfileRequest(
    Guid UserId,
    string UserName,
    string DisplayName,
    AvatarOperation AvatarOperation
);