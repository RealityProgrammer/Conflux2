using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Commands;

public sealed record DeleteServerRoleCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid RoleId
) : ICommand<Result>, IServerCommand {
    public ServerPermissions RequiredPermissions => ServerPermissions.DeleteRole;
}