using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record DeleteServerRoleCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid RoleId
) : ICommand<Result>, IServerCommand;