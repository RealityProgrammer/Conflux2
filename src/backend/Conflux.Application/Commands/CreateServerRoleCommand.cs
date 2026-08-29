using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record CreateServerRoleCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    string Name
) : ICommand<Result<Guid>>, IServerCommand;