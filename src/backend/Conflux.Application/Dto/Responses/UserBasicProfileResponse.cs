namespace Conflux.Application.Dto.Responses;

public sealed record UserBasicProfileResponse(
    string? UserName,
    string? DisplayName,
    bool HasAvatar
);