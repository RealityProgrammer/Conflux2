namespace Conflux.Domain.Dto;

public sealed record CommunityServerProfileDto(
    Guid Id,
    string Name,
    string? Description,
    bool HasAvatar
);