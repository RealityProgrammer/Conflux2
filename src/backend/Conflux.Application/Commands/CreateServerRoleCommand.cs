using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record CreateServerRoleCommand(
    Guid CreatorId,
    Guid ServerId,
    string Name
) : ICommand<Result<Guid>>;