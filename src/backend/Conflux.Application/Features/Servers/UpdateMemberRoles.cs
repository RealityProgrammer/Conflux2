using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record UpdateMemberRolesCommand(
    Guid ServerId,
    Guid InteractMemberUserId,
    IReadOnlyCollection<Guid> AddRoleIds,
    IReadOnlyCollection<Guid> RemoveRoleIds
) : ICommand<Result>, IServerMemberInteractCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [
        ServerPermission.ManageMembers, 
        ServerPermission.UpdateMemberRoles
    ];
}

public sealed record MemberRolesUpdatedNotification(
    Guid ServerId,
    Guid MemberUserId,
    Guid MemberId
) : INotification;

public sealed class UpdateMemberRolesHandler(
    IServerMemberReadRepository memberReadRepository,
    IServerPermissionsCacheService serverPermissionsCacheService,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    ILogger<UpdateMemberRolesHandler> logger
) : ICommandHandler<UpdateMemberRolesCommand, Result> {
    public async ValueTask<Result> Handle(UpdateMemberRolesCommand command, CancellationToken cancellationToken) {
        var serverId = command.ServerId;
        var updatingMemberUserId = command.InteractMemberUserId;
        
        var updatingMember = await memberReadRepository.AsQueryable()
            .Where(m => m.CommunityServerId == serverId && m.UserId == updatingMemberUserId)
            .Include(m => m.Roles)
            .Include(m => m.CommunityServer)
            .ThenInclude(m => m.Roles)
            .FirstOrDefaultAsync(cancellationToken);
        
        if (updatingMember == null) {
            return Errors.ResourceNotFound("Server member", [
                new(nameof(CommunityServerMember.CommunityServerId), serverId.ToString()),
                new(nameof(CommunityServerMember.UserId), updatingMemberUserId.ToString()),
            ]);
        }
        
        var defaultRole = updatingMember.CommunityServer.Roles.First(r => r.SpecialRoleType == SpecialRoleType.Default);
        
        // apply removal
        if (command.RemoveRoleIds is { Count: > 0 } removeRoleIds) {
            foreach (var roleId in removeRoleIds) {
                var roleToRemove = updatingMember.Roles.FirstOrDefault(r => r.Id == roleId);
                
                // only allow removal non-special roles
                if (roleToRemove is { SpecialRoleType: SpecialRoleType.None }) {
                    updatingMember.Roles.Remove(roleToRemove);
                }
            }
        }
        
        // apply add
        if (command.AddRoleIds is { Count: > 0 } addRoleIds) {
            var rolesToAdd = updatingMember.CommunityServer.Roles
                .Where(r => addRoleIds.Contains(r.Id) && updatingMember.Roles.All(mr => mr.Id != r.Id))
                .ToList();

            foreach (var roleToAdd in rolesToAdd) {
                updatingMember.Roles.Add(roleToAdd);
            }
        }
        
        // recalculate highest authorization role
        if (updatingMember.Roles.Count == 0) {
            updatingMember.HighestAuthorizeRole = defaultRole;
            updatingMember.HighestAuthorizeLevel = defaultRole.AuthorizeLevel;
        } else {
            var highest = updatingMember.Roles.OrderByDescending(r => r.AuthorizeLevel).First();
            
            updatingMember.HighestAuthorizeRole = highest;
            updatingMember.HighestAuthorizeLevel = highest.AuthorizeLevel;
        }

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while updating roles for member.");
            return Errors.UnexpectedError();
        }

        await serverPermissionsCacheService.DeleteMemberAuthorizeInfo(updatingMemberUserId, CancellationToken.None);
        await mediator.Publish(new MemberRolesUpdatedNotification(updatingMember.CommunityServerId, updatingMember.UserId, updatingMember.Id), CancellationToken.None);
            
        return Result.Success();
    }
}