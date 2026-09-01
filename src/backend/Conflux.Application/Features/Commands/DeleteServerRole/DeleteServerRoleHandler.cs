using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Commands.DeleteServerRole;

public sealed class DeleteServerRoleHandler(
    ICommunityServerRoleRepository repository,
    IServerPermissionsCacheService permissionsCacheService
) : ICommandHandler<DeleteServerRoleCommand, Result> {
    public async ValueTask<Result> Handle(DeleteServerRoleCommand command, CancellationToken cancellationToken) {
        bool deleted = await repository.Delete(command.RoleId, command.ServerId);

        if (deleted) {
            await permissionsCacheService.IncrementServerPermissionVersion(command.ServerId, CancellationToken.None);
            return Result.Success();
        }
        
        return Errors.ResourceNotFound("Server role");
    }
}