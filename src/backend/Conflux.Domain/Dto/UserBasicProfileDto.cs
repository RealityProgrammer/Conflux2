namespace Conflux.Domain.Dto;

public sealed record UserBasicProfileDto(
    Guid Id,
    string? UserName,
    string? DisplayName,
    bool HasAvatar
);