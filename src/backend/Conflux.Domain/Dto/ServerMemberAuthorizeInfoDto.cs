using Conflux.Domain.Enums;
using MemoryPack;

namespace Conflux.Domain.Dto;

[MemoryPackable]
public sealed partial record ServerMemberAuthorizeInfoDto(
    Guid MemberId,
    int AuthorizeLevel,
    IReadOnlySet<ServerPermission> EffectivePermissions,
    MemberRoleDto[] Roles,
    bool IsBanned
);

[MemoryPackable]
public sealed partial record MemberRoleDto(
    Guid Id,
    string Name
);