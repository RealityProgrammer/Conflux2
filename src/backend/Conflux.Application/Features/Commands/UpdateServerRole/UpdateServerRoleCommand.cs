using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Commands.UpdateServerRole;

public sealed record UpdateServerRoleCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid RoleId,
    PatchField<string> Name,
    PatchField<int> AuthorizeLevel,
    Dictionary<ServerPermission, PermissionState>? PermissionStates
) : ICommand<Result<ServerRoleDto>>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.UpdateRole];
}