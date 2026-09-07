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
    IServerMemberReadRepository repository,
    IUnitOfWork unitOfWork,
    ILogger<UpdateMemberRolesHandler> logger
) : ICommandHandler<UpdateMemberRolesCommand, Result> {
    public async ValueTask<Result> Handle(UpdateMemberRolesCommand command, CancellationToken cancellationToken) {
        var member = await repository.AsQueryable()
            .Where(m => m.CommunityServerId == command.ServerId && m.Id == command.MemberId)
            .Include(member => member.MemberRoles)
            .ThenInclude(role => role.Role)
            .FirstOrDefaultAsync(cancellationToken);

        if (member == null) {
            return Errors.ResourceNotFound($"Community server member (Id = {command.MemberId})");
        }
        
        // prevent duplicate role ids
        var incomingRoleIds = command.RoleIds.Distinct().ToHashSet();

        await unitOfWork.BeginTransactionAsync(cancellationToken);

        try {
            // remove roles that not appear on the new role list
            foreach (var role in member.MemberRoles.Where(mr => !incomingRoleIds.Contains(mr.RoleId)).ToList()) {
                if (role.Role.SpecialRoleType != SpecialRoleType.None) {
                    continue;
                }
                
                member.MemberRoles.Remove(role);
            }
            
            var existingRoleIds = member.MemberRoles.Select(mr => mr.RoleId).ToHashSet();
            foreach (var roleId in incomingRoleIds.Where(id => !existingRoleIds.Contains(id))) {
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