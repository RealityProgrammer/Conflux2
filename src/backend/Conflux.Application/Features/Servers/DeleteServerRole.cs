using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Servers;

public sealed record DeleteServerRoleCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid RoleId
) : ICommand<Result>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.DeleteRole];
}

public sealed record ServerRoleDeletedNotification(
    Guid ServerId,
    Guid RoleId
) : INotification;

public sealed class DeleteServerRoleHandler(
    ICommunityServerRoleRepository repository,
    IServerPermissionsCacheService permissionsCacheService,
    IMediator mediator
) : ICommandHandler<DeleteServerRoleCommand, Result> {
    public async ValueTask<Result> Handle(DeleteServerRoleCommand command, CancellationToken cancellationToken) {
        bool deleted = await repository.Delete(command.RoleId, command.ServerId);

        if (deleted) {
            await permissionsCacheService.IncrementServerPermissionVersion(command.ServerId, CancellationToken.None);
            
            await mediator.Publish(
                new ServerRoleDeletedNotification(command.ServerId, command.RoleId),
                CancellationToken.None
            );
            
            return Result.Success();
        }
        
        return Errors.ResourceNotFound("Server role");
    }
}