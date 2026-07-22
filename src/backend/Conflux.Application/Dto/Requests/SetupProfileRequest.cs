namespace Conflux.Application.Dto.Requests;

public record SetupProfileRequest(
    Guid UserId,
    string UserName,
    string DisplayName,
    AvatarOperation AvatarOperation
);