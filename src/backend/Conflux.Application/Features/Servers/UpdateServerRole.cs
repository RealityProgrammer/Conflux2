using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Servers;

public sealed record UpdateServerRoleCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid RoleId,
    PatchField<string> Name,
    PatchField<int> AuthorizeLevel,
    Dictionary<ServerPermission, PermissionState>? PermissionStates
) : ICommand<Result<ServerRoleDto>>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.UpdateRole];
}

public sealed record ServerRoleUpdatedNotification(Guid ServerId) : INotification;

public sealed class UpdateServerRoleHandler(
    ICommunityServerRoleRepository repository,
    IUnitOfWork unitOfWork,
    IServerPermissionsCacheService serverPermissionsCacheService,
    IServerPermissionsProvider permissionsProvider,
    IMediator mediator
) : ICommandHandler<UpdateServerRoleCommand, Result<ServerRoleDto>> {
    public async ValueTask<Result<ServerRoleDto>> Handle(UpdateServerRoleCommand command, CancellationToken cancellationToken) {
        CommunityServerRole? role = await repository.FindById(command.RoleId, true, cancellationToken);

        if (role == null || role.CommunityServerId != command.ServerId) {
            return Errors.ResourceNotFound("Server role");
        }

        if (role.SpecialRoleType == SpecialRoleType.Owner) {
            return Errors.Forbidden("Updating Owner role is not allowed.");
        }

        if (role.SpecialRoleType == SpecialRoleType.Default && command.AuthorizeLevel.IsSet) {
            return Errors.Forbidden("Updating authorize level of Default role is not allowed.");
        }
        
        // restrict member from updating role with higher authorize level
        var result = await permissionsProvider.GetUserPermissions(command.ServerId, command.ExecutorUserId, cancellationToken);

        if (!result.IsSuccess) {
            return result.Error;
        }

        if (role.AuthorizeLevel >= result.Value!.AuthorizeLevel) {
            return Errors.Forbidden("Updating role with authorize level higher or equals to yours is not allowed.");
        }
        
        if (command.Name.IsSet) {
            role.Name = command.Name.Value!;
        }

        if (command.AuthorizeLevel.IsSet) {
            role.AuthorizeLevel = command.AuthorizeLevel.Value;
        }
        
        if (command.PermissionStates is { Count: > 0} permissionStates) {
            foreach ((var targetPermission, var newState) in permissionStates) {
                var existingRecord = role.Permissions.FirstOrDefault(p => p.Permission == targetPermission);
                
                if (newState == PermissionState.Inherit) {
                    // if it is "inherit" then we don't need a record in the database at all
                    if (existingRecord != null) {
                        role.Permissions.Remove(existingRecord);
                    }
                } 
                else {
                    // overwrite or add new record depend on the existing record exist
                    if (existingRecord != null) {
                        existingRecord.State = newState;
                    } 
                    else {
                        role.Permissions.Add(new() {
                            RoleId = role.Id,
                            Permission = targetPermission,
                            State = newState
                        });
                    }
                }
            }
        }
        
        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);

            await serverPermissionsCacheService.IncrementServerPermissionVersion(command.ServerId, CancellationToken.None);

            await mediator.Publish(new ServerRoleUpdatedNotification(command.ServerId), CancellationToken.None);
            
            return Result<ServerRoleDto>.Success(new(
                role.Id,
                role.Name,
                role.Permissions.ToDictionary(p => p.Permission, p => p.State),
                role.AuthorizeLevel
            ));
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception) {
            return Errors.UnexpectedError();
        }
    }
}