using Conflux.Domain.Enums;

namespace Conflux.Application.Dto;

public sealed record ServerRoleDto(
    Guid Id,
    string Name,
    Dictionary<ServerPermission, PermissionState> States,
    int AuthorizeLevel
);