using Conflux.Domain.Enums;

namespace Conflux.Application.Dto;

public sealed record ServerMemberPermissionsDto(
    Guid UserId,
    Guid MemberId,
    ServerPermissions EffectivePermissions,
    int AuthorizeLevel,
    CommunityServerRoleDto[] Roles
);