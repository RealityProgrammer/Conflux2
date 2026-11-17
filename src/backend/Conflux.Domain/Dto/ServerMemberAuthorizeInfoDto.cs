using Conflux.Domain.Enums;
using MemoryPack;

namespace Conflux.Domain.Dto;

[MemoryPackable]
public sealed partial record ServerMemberAuthorizeInfoDto(
    Guid MemberId,
    int AuthorizeLevel,
    HashSet<ServerPermission> EffectivePermissions,
    MemberRoleDto[] Roles,
    bool IsBanned
);

[MemoryPackable]
public sealed partial record MemberRoleDto(
    Guid Id,
    SpecialRoleType SpecialRoleType,
    string Name
);