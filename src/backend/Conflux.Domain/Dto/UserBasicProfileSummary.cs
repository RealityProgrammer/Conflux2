namespace Conflux.Domain.Dto;

public sealed record UserBasicProfileSummary(
    Guid Id,
    string? UserName,
    string? DisplayName,
    bool HasAvatar
);