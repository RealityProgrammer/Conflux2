using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Commands.DeleteServerRole;

public sealed record DeleteServerRoleCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid RoleId
) : ICommand<Result>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.DeleteRole];
}