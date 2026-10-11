using Conflux.Domain.Enums;
using MemoryPack;

namespace Conflux.Application.Dto;

[MemoryPackable]
public sealed partial record RoleAuthorizeInfo(
    int AuthorizeLevel,
    IReadOnlyDictionary<ServerPermission, PermissionState> Permissions
);