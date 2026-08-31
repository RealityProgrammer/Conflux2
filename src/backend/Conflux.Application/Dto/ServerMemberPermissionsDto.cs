using Conflux.Domain.Enums;

namespace Conflux.Application.Dto;

public sealed record ServerMemberPermissionsDto(
    Guid MemberId,
    int AuthorizeLevel,
    IReadOnlyDictionary<ServerPermission, bool> EffectivePermissions,
    MemberRoleDto[] Roles
);

public sealed record MemberRoleDto(
    Guid Id,
    string Name
);