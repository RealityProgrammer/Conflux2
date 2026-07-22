namespace Conflux.Application.Dto.Responses;

public record UserBasicProfileResponse(
    string? UserName,
    string? DisplayName,
    bool HasAvatar
);