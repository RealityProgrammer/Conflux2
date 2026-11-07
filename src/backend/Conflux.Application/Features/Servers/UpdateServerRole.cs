using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics.CodeAnalysis;

namespace Conflux.Application.Features.Servers;

public sealed record UpdateServerRoleCommand(
    Guid ServerId,
    Guid RoleId,
    Optional<string> Name,
    Optional<int> AuthorizeLevel,
    IReadOnlyDictionary<ServerPermission, PermissionState> PermissionStates
) : ICommand<Result<ServerRoleDto>>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.UpdateRole];
}

[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)]
public sealed class UpdateServerRoleCommandValidator : AbstractValidator<UpdateServerRoleCommand> {
    public UpdateServerRoleCommandValidator() {
        RuleFor(c => c.Name)
            .Must(name => !name.HasValue || name.Value is { Length: >= 1 and <= 32 })
            .WithMessage("{PropertyName} must have at least 1 and maximum of 32 characters.");
        
        RuleFor(c => c.AuthorizeLevel)
            .Must(level => !level.HasValue || level.Value is >= 0 and <= 500_000)
            .WithMessage("Authorize level must be greater than or equal to 0 and less than or equal to 500000.");
    }
}

public sealed record ServerRoleUpdatedNotification(Guid ServerId, Guid RoleId) : INotification;
public sealed record ServerDefaultRoleUpdatedNotification(Guid ServerId) : INotification;

public sealed class UpdateServerRoleHandler(
    ICurrentUserService currentUserService,
    ICommunityServerRoleRepository serverRoleRepository,
    IServerMemberReadRepository serverMemberReadRepository,
    IUnitOfWork unitOfWork,
    IServerPermissionsProvider permissionsProvider,
    IPublisher publisher,
    IServerRoleVersioningService serverRoleVersioningService,
    IServerDefaultRoleAuthorizeProvider defaultRoleAuthorizeProvider,
    ILogger<UpdateServerRoleHandler> logger
) : ICommandHandler<UpdateServerRoleCommand, Result<ServerRoleDto>> {
    public async ValueTask<Result<ServerRoleDto>> Handle(UpdateServerRoleCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        var serverId = command.ServerId;
        var roleId = command.RoleId;
        
        CommunityServerRole? updatingRole = await serverRoleRepository
            .AsQueryable()
            .Where(r => r.CommunityServerId == serverId && r.Id == roleId)
            .Include(r => r.CommunityServer)
            .ThenInclude(s => s.Roles)
            .FirstOrDefaultAsync(cancellationToken);

        switch (updatingRole) {
            case null:
                return Errors.ResourceNotFound("Server role", [
                    new(nameof(CommunityServerRole.Id), roleId.ToString()),
                    new(nameof(CommunityServerRole.CommunityServerId), serverId.ToString()),
                ]);
            
            case var _ when updatingRole.SpecialRoleType == SpecialRoleType.Owner:
                return Errors.Forbidden("Updating Owner role is not allowed.");
            
            case var _ when updatingRole.SpecialRoleType == SpecialRoleType.Default && command.AuthorizeLevel.HasValue:
                return Errors.Forbidden("Updating authorize level of Default role is not allowed.");
        }
        
        // check the authorize level of the user, restrict from updating role with higher or equal authorize level
        var result = await permissionsProvider.GetUserAuthorizeInfo(serverId, userId, cancellationToken);

        if (!result.IsSuccess) {
            return result.Error;
        }

        if (updatingRole.AuthorizeLevel >= result.Value!.AuthorizeLevel) {
            return Errors.Forbidden("Updating role with authorize level higher or equals to yours is not allowed.");
        }
        
        if (command.Name.HasValue) {
            updatingRole.Name = command.Name.Value!;
        }

        if (command.AuthorizeLevel.HasValue) {
            updatingRole.AuthorizeLevel = command.AuthorizeLevel.Value;
            
            // need to recalculate the highest authorize level for every member owning this role
            var affectedMembers = await serverMemberReadRepository
                .AsQueryable()
                .Where(m => m.CommunityServerId == serverId && m.Roles.Any(r => r.Id == roleId))
                .Include(m => m.Roles)
                .ToListAsync(cancellationToken);
            
            var defaultRole = updatingRole.CommunityServer.Roles.First(r => r.SpecialRoleType == SpecialRoleType.Default);

            foreach (var member in affectedMembers) {
                if (member.Roles.Count == 0) {
                    member.HighestAuthorizeRole = defaultRole;
                    member.HighestAuthorizeLevel = defaultRole.AuthorizeLevel;
                } else {
                    var highest = member.Roles.OrderByDescending(r => r.AuthorizeLevel).First();

                    member.HighestAuthorizeRole = highest;
                    member.HighestAuthorizeLevel = highest.AuthorizeLevel;
                }
            }
        }
        
        if (command.PermissionStates is { Count: > 0 } permissionStates) {
            foreach ((var targetPermission, var newState) in permissionStates) {
                var existingRecord = updatingRole.Permissions.FirstOrDefault(p => p.Permission == targetPermission);
                
                if (newState == PermissionState.Inherit) {
                    // if it is "inherit" then we don't need a record in the database at all
                    if (existingRecord != null) {
                        updatingRole.Permissions.Remove(existingRecord);
                    }
                } 
                else {
                    // overwrite or add new record depend on the existing record exist
                    if (existingRecord != null) {
                        existingRecord.State = newState;
                    } else {
                        updatingRole.Permissions.Add(new() {
                            RoleId = updatingRole.Id,
                            Permission = targetPermission,
                            State = newState,
                        });
                    }
                }
            }
        }

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while updating server role {id}.", roleId);
            return Errors.UnexpectedError();
        }
        
        await serverRoleVersioningService.Increment(serverId);

        if (updatingRole.SpecialRoleType == SpecialRoleType.Default) {
            await defaultRoleAuthorizeProvider.Remove(serverId);
            await publisher.Publish(new ServerDefaultRoleUpdatedNotification(serverId), CancellationToken.None);
        } else {
            await publisher.Publish(new ServerRoleUpdatedNotification(serverId, roleId), CancellationToken.None);
        }
        
        return Result<ServerRoleDto>.Success(new(
            updatingRole.Id,
            updatingRole.Name,
            updatingRole.Permissions.ToDictionary(p => p.Permission, p => p.State),
            updatingRole.AuthorizeLevel
        ));
    }
}