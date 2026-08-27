using Conflux.Application.Commands;
using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class DeleteServerRoleHandler(
    ICommunityServerRoleRepository repository
) : ICommandHandler<DeleteServerRoleCommand, Result> {
    public async ValueTask<Result> Handle(DeleteServerRoleCommand command, CancellationToken cancellationToken) {
        bool deleted = await repository.Delete(command.RoleId, command.ServerId);
        return deleted ? Result.Success() : Errors.ResourceNotFound("Role");
    }
}