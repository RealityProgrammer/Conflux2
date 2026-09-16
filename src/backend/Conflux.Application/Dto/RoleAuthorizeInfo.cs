using Conflux.Domain.Enums;

namespace Conflux.Application.Dto;

public sealed record RoleAuthorizeInfo(
    int AuthorizeLevel,
    IReadOnlyDictionary<ServerPermission, PermissionState> Permissions
);