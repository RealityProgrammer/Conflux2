using Conflux.Domain.Enums;
using MemoryPack;

namespace Conflux.Application.Dto;

public sealed record ServerMemberAuthorizationInfoDto(
    Guid MemberId,
    int AuthorizeLevel,
    IReadOnlyDictionary<ServerPermission, bool> EffectivePermissions,
    MemberRoleDto[] Roles,
    bool IsBanned
);

[MemoryPackable]
public sealed partial record MemberRoleDto(
    Guid Id,
    string Name
);