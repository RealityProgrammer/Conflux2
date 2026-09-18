using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record UpdateMemberRolesCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid InteractingMemberId,
    IReadOnlyCollection<Guid> RoleIds
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
    ICommunityServerRoleRepository roleRepository,
    IServerPermissionsProvider serverPermissionsProvider,
    IServerPermissionsCacheService serverPermissionsCacheService,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    ILogger<UpdateMemberRolesHandler> logger
) : ICommandHandler<UpdateMemberRolesCommand, Result> {
    public async ValueTask<Result> Handle(UpdateMemberRolesCommand command, CancellationToken cancellationToken) {
        // get the executor user authorize info to compare role authorize level later.
        var executorAuthorizeInfoResult = await serverPermissionsProvider.GetUserAuthorizeInfo(
            command.ServerId, 
            command.ExecutorUserId,
            cancellationToken
        );

        if (!executorAuthorizeInfoResult.IsSuccess) {
            return executorAuthorizeInfoResult.Error;
        }

        var executorAuthorizeInfo = executorAuthorizeInfoResult.Value!;

        // prevent duplicate role ids
        var deduplicatedRoleIds = command.RoleIds.Distinct().ToHashSet();
        
        // ensure that the roles are all valid ids, and have authorize level lower than or equal to user's authorize level.
        var roleInfos = await roleRepository.AsQueryable()
            .Where(r =>
                r.CommunityServerId == command.ServerId &&
                command.RoleIds.Contains(r.Id) &&
                r.SpecialRoleType == SpecialRoleType.None &&
                r.AuthorizeLevel <= executorAuthorizeInfo.AuthorizeLevel
            )
            .Select(r => new { r.Id, r.AuthorizeLevel })
            .ToListAsync(cancellationToken);

        if (roleInfos.Count != command.RoleIds.Count) {
            // imagine that it would be very fucked if somehow roleInfos.length > command.roleIds lmao
            var missingRoleIds = command.RoleIds.Except(roleInfos.Select(r => r.Id));
            return Errors.ResourceNotFound(
                $"Community server role (Ids = [{string.Join(", ", missingRoleIds)}])"
            );
        }

        if (roleInfos.FirstOrDefault(r => r.AuthorizeLevel > executorAuthorizeInfo.AuthorizeLevel) is { } surpassedRole) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(command.RoleIds)] = [
                    $"Role {surpassedRole.Id} have authorize level surpassed user's authorize level.",
                ]
            });
        }
        
        var member = await memberReadRepository.AsQueryable()
            .Where(m => m.CommunityServerId == command.ServerId && m.Id == command.InteractingMemberId)
            .Include(member => member.MemberRoles)
            .ThenInclude(role => role.Role)
            .FirstOrDefaultAsync(cancellationToken);

        if (member == null) {
            return Errors.ResourceNotFound($"Community server member (Id = {command.InteractingMemberId})");
        }
        
        await unitOfWork.BeginTransactionAsync(cancellationToken);

        try {
            // remove roles that not appear on the new role list
            foreach (var role in member.MemberRoles.Where(mr => !deduplicatedRoleIds.Contains(mr.RoleId)).ToList()) {
                if (role.Role.SpecialRoleType != SpecialRoleType.None) {
                    continue;
                }
                
                member.MemberRoles.Remove(role);
            }
            
            var existingRoleIds = member.MemberRoles.Select(mr => mr.RoleId).ToHashSet();
            foreach (var roleId in deduplicatedRoleIds.Where(id => !existingRoleIds.Contains(id))) {
                member.MemberRoles.Add(new() { 
                    RoleId = roleId,
                });
            }

            await unitOfWork.SaveChangesAsync(cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);
        } catch (OperationCanceledException) {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Error occurred while updating member roles.");
            
            await unitOfWork.RollbackAsync(cancellationToken);
            return Errors.UnexpectedError();
        }
        
        await serverPermissionsCacheService.DeleteMemberAuthorizeInfo(command.InteractingMemberId, CancellationToken.None);
        await mediator.Publish(new MemberRolesUpdatedNotification(member.CommunityServerId, member.UserId, member.Id), CancellationToken.None);
            
        return Result.Success();
    }
}