using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Commands.CreateServerRole;

public sealed record CreateServerRoleCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    string Name
) : ICommand<Result<Guid>>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.CreateRole];
}