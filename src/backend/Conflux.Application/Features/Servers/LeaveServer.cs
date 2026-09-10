using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record LeaveServerCommand(Guid UserId, Guid ServerId) : ICommand<Result>;

public sealed class LeaveServerCommandHandler(
    IServerMemberReadRepository memberReadRepository,
    IUnitOfWork unitOfWork
) : ICommandHandler<LeaveServerCommand, Result> {
    public async ValueTask<Result> Handle(LeaveServerCommand command, CancellationToken cancellationToken) {
        CommunityServerMember? member = await memberReadRepository.AsQueryable()
            .Where(r => r.CommunityServerId == command.ServerId && r.UserId == command.UserId)
            .Include(r => r.Roles)
            .FirstOrDefaultAsync(cancellationToken);
        
        if (member == null) {
            return Errors.ResourceNotFound($"Community server member (CommunityServerId = ${command.ServerId}, UserId = ${command.UserId})");
        }

        if (member.Roles.Any(r => r.SpecialRoleType == SpecialRoleType.Owner)) {
            return Errors.Forbidden("Owner cannot leave server.");
        }

        member.Status = MembershipStatus.Left;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}