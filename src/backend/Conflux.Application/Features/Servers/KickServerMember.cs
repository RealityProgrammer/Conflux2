using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record KickServerMemberCommand(
    Guid ExecutorUserId, 
    Guid ServerId, 
    Guid InteractingMemberId
) : ICommand<Result>, IServerMemberInteractCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [
        ServerPermission.ManageMembers, 
        ServerPermission.KickMembers,
    ];
}

public sealed record ServerMemberKickedNotification(Guid ServerId, Guid KickedMemberUserId, Guid KickedMemberId) : INotification;

public sealed class KickServerMemberHandler(
    IServerMemberReadRepository memberReadRepository,
    IServerPermissionsCacheService permissionsCacheService,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    ILogger<KickServerMemberHandler> logger
) : ICommandHandler<KickServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(KickServerMemberCommand command, CancellationToken cancellationToken) {
        CommunityServerMember? member = await memberReadRepository.AsQueryable()
            .Where(m => m.CommunityServerId == command.ServerId && m.Id == command.InteractingMemberId)
            .Include(m => m.Roles)
            .FirstOrDefaultAsync(cancellationToken);

        if (member == null) {
            return Errors.ResourceNotFound($"Community server member (CommunityServerId = {command.ServerId}, Id = {command.InteractingMemberId})");
        }

        if (member.Status != MembershipStatus.Active) {
            return Errors.ServerMemberNotActive();
        }

        if (member.Roles.Any(r => r.SpecialRoleType == SpecialRoleType.Owner)) {
            return Errors.Forbidden("Owner cannot be kicked.");
        }

        try {
            member.Status = MembershipStatus.Kicked;
            member.Roles.Clear();   // clear the roles too

            await unitOfWork.SaveChangesAsync(cancellationToken);

            await permissionsCacheService.DeleteUserAuthorizeInfo(member.CommunityServerId, member.UserId, CancellationToken.None);
            await mediator.Publish(new ServerMemberKickedNotification(command.ServerId, member.UserId, member.Id), CancellationToken.None);
            
            return Result.Success();
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Error occurred while kicking server member.");
            return Errors.UnexpectedError();
        }
    }
}