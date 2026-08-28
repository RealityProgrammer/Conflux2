using Conflux.Domain.Enums;

namespace Conflux.Application.Dto;

public sealed record CommunityServerRoleDto(
    Guid Id,
    string Name,
    ServerPermissions Permissions,
    int AuthorizeLevel
);