using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Commands;

public sealed record CreateServerRoleCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    string Name
) : ICommand<Result<Guid>>, IServerCommand {
    public ServerPermissions RequiredPermissions => ServerPermissions.CreateRole;
}