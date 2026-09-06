using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

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
    ICommunityServerMemberRepository repository,
    IUnitOfWork unitOfWork
) : ICommandHandler<UpdateMemberRolesCommand, Result> {
    public async ValueTask<Result> Handle(UpdateMemberRolesCommand command, CancellationToken cancellationToken) {
        var member = await repository.GetFromId(command.MemberId, true, cancellationToken);

        if (member == null) {
            return Errors.ResourceNotFound("Community server member");
        }
        
        // prevent duplicate role ids
        var incomingRoleIds = command.RoleIds.Distinct().ToHashSet();

        await unitOfWork.BeginTransactionAsync(cancellationToken);

        try {
            // remove roles that not appear on the new role list
            foreach (var role in member.MemberRoles.Where(mr => !incomingRoleIds.Contains(mr.RoleId))) {
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
        } catch {
            await unitOfWork.RollbackAsync(cancellationToken);
            return Errors.UnexpectedError();
        }
    }
}