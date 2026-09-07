using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record UpdateMemberRolesCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid MemberId,
    IReadOnlyCollection<Guid> RoleIds
) : ICommand<Result>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.UpdateMemberRoles];
}

public sealed class UpdateMemberRolesHandler(
    IServerMemberReadRepository memberReadRepository,
    ICommunityServerRoleRepository roleRepository,
    IServerPermissionsProvider serverPermissionsProvider,
    IUnitOfWork unitOfWork,
    ILogger<UpdateMemberRolesHandler> logger
) : ICommandHandler<UpdateMemberRolesCommand, Result> {
    public async ValueTask<Result> Handle(UpdateMemberRolesCommand command, CancellationToken cancellationToken) {
        // get the executor user authorize info to compare role authorize level later.
        var userAuthorizeResult = await serverPermissionsProvider.GetUserPermissions(
            command.ServerId, 
            command.ExecutorUserId,
            cancellationToken
        );

        if (!userAuthorizeResult.IsSuccess) {
            return userAuthorizeResult.Error;
        }

        var userAuthorize = userAuthorizeResult.Value!;
        
        // prevent duplicate role ids
        var deduplicatedRoleIds = command.RoleIds.Distinct().ToHashSet();
        
        // ensure that the roles are all valid ids, and have authorize level lower than or equal to user's authorize level.
        var roleInfos = await roleRepository.AsQueryable()
            .Where(r =>
                r.CommunityServerId == command.ServerId &&
                command.RoleIds.Contains(r.Id) &&
                r.SpecialRoleType == SpecialRoleType.None &&
                r.AuthorizeLevel <= userAuthorize.AuthorizeLevel
            )
            .Select(r => new { r.Id, r.AuthorizeLevel })
            .ToListAsync(cancellationToken);

        if (roleInfos.Count != command.RoleIds.Count) {
            // imagine that it would be very fucked if somehow roleInfos.length > command.roleIds lmao
            return Errors.ResourceNotFound(
                $"Community server role (Ids = [{string.Join(", ", roleInfos.ExceptBy(command.RoleIds, r => r.Id))}])"
            );
        }

        if (roleInfos.FirstOrDefault(r => r.AuthorizeLevel > userAuthorize.AuthorizeLevel) is { } surpassedRole) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(command.RoleIds)] = [
                    $"Role {surpassedRole.Id} have authorize level surpassed user's authorize level.",
                ]
            });
        }
        
        var member = await memberReadRepository.AsQueryable()
            .Where(m => m.CommunityServerId == command.ServerId && m.Id == command.MemberId)
            .Include(member => member.MemberRoles)
            .ThenInclude(role => role.Role)
            .FirstOrDefaultAsync(cancellationToken);

        if (member == null) {
            return Errors.ResourceNotFound($"Community server member (Id = {command.MemberId})");
        }
        
        
        // TODO: Validate that user can assign the roles with less than or equals to their authorize level.
        
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
            
            return Result.Success();
        } catch (OperationCanceledException) {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Error occurred while updating member roles.");
            
            await unitOfWork.RollbackAsync(cancellationToken);
            return Errors.UnexpectedError();
        }
    }
}