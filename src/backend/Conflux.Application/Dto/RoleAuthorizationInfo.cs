using Conflux.Domain.Enums;

namespace Conflux.Application.Dto;

public sealed record RoleAuthorizationInfo(
    int AuthorizeLevel,
    IReadOnlyDictionary<ServerPermission, PermissionState> Permissions
);