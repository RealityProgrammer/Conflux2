namespace Conflux.Application.Responses;

public record UserBasicProfileResponse(
    string? UserName,
    string? DisplayName,
    bool HasAvatar
);