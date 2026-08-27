using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record DeleteServerRoleCommand(
    Guid UserId,
    Guid ServerId,
    Guid RoleId
) : ICommand<Result>;