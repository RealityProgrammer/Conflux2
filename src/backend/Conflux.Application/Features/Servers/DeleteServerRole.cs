using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record DeleteServerRoleCommand(
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
    ICommunityServerRoleRepository serverRoleRepository,
    IServerRoleVersioningService serverRoleVersioningService,
    IServerMemberReadRepository serverMemberReadRepository,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<DeleteServerRoleHandler> logger
) : ICommandHandler<DeleteServerRoleCommand, Result> {
    public async ValueTask<Result> Handle(DeleteServerRoleCommand command, CancellationToken cancellationToken) {
        var roleId = command.RoleId;
        
        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try {
            // get deleting role and server default role
            var deletingRole = await serverRoleRepository
                .AsQueryable()
                .Include(r => r.CommunityServer)
                .ThenInclude(s => s.Roles)
                .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

            if (deletingRole == null) {
                return Errors.ResourceNotFound("Server role", [
                    new(nameof(CommunityServerRole.Id), roleId.ToString()),
                ]);
            }

            if (deletingRole.SpecialRoleType != SpecialRoleType.None) {
                return Errors.Forbidden("Deleting special role is not allowed.");
            }
            
            var defaultRole = deletingRole.CommunityServer.Roles.First(r => r.SpecialRoleType == SpecialRoleType.Default);
            
            // get all members who have the deleting role to recalculate highest authorize level role.
            var affectedMembers = await serverMemberReadRepository
                .AsQueryable()
                .Where(m => m.Roles.Any(r => r.Id == roleId))
                .Include(m => m.Roles)
                .ToListAsync(cancellationToken);
            
            foreach (var member in affectedMembers) {
                // can we just do member.Roles.Remove(deletingRole)?
                var roleToRemove = member.Roles.FirstOrDefault(r => r.Id == roleId);
                
                if (roleToRemove != null) {
                    member.Roles.Remove(roleToRemove);
                }

                if (member.Roles.Count == 0) {
                    // member doesn't have any role, highest authorize role is now the default role
                    member.HighestAuthorizeLevel = defaultRole.AuthorizeLevel;
                    member.HighestAuthorizeRole = defaultRole;
                } else {
                    var highestAuthorizeRole = member.Roles.OrderByDescending(r => r.AuthorizeLevel).First();
                    
                    member.HighestAuthorizeLevel = highestAuthorizeRole.AuthorizeLevel;
                    member.HighestAuthorizeRole = highestAuthorizeRole;
                }
            }
            
            // remove the role
            serverRoleRepository.Remove(deletingRole);
            
            // save
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);
        } catch (OperationCanceledException) {
            await unitOfWork.RollbackAsync(CancellationToken.None);
            throw;
        } catch (Exception e) {
            await unitOfWork.RollbackAsync(CancellationToken.None);
            logger.LogError(e, "Exception thrown while deleting server role {roleId}.", roleId);
            return Errors.UnexpectedError();
        }

        // after all that, increment the server role versioning and publish notification
        await serverRoleVersioningService.Increment(command.ServerId);
        await publisher.Publish(
            new ServerRoleDeletedNotification(command.ServerId, roleId),
            CancellationToken.None
        );
        
        return Result.Success();
    }
}