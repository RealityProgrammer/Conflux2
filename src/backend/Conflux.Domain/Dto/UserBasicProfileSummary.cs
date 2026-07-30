namespace Conflux.Domain.Dto;

public sealed record UserBasicProfileSummary(
    string? UserName,
    string? DisplayName,
    bool HasAvatar
);