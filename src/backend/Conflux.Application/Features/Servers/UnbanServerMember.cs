using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record UnbanServerMemberCommand(
    Guid ServerId,
    Guid InteractMemberUserId
) : ICommand<Result>, IServerMemberInteractCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [
        ServerPermission.ManageMembers,
        ServerPermission.UnbanMembers,
    ];
}

public sealed record ServerMemberUnbannedNotification(
    Guid ServerId, 
    Guid UnbannedMemberUserId, 
    Guid UnbannedMemberId
) : INotification;

public sealed class UnbanServerMemberHandler(
    ICurrentUserService currentUserService,
    IServerMemberRepository memberRepository,
    IServerPermissionsCacheService permissionsCacheService,
    IServerModerationLogRepository moderationLogRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    ILogger<BanServerMemberCommand> logger
) : ICommandHandler<UnbanServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(UnbanServerMemberCommand command, CancellationToken cancellationToken) {
        Guid executorUserId = currentUserService.UserId!.Value;
        Guid serverId = command.ServerId;
        Guid interactMemberUserId = command.InteractMemberUserId;
        
        var executorMemberId = memberRepository.AsQueryable()
            .AsNoTracking()
            .Where(m => m.CommunityServerId == serverId && m.UserId == executorUserId)
            .Select(m => m.Id)
            .Cast<Guid?>()
            .FirstOrDefault();

        if (!executorMemberId.HasValue) {
            return Errors.ResourceNotFound("Server member", [
                new(nameof(CommunityServerMember.CommunityServerId), serverId.ToString()),
                new(nameof(CommunityServerMember.UserId), executorUserId.ToString()),
            ]);
        }
        
        CommunityServerMember? affectedMember = await memberRepository.AsQueryable()
            .Where(m => m.CommunityServerId == serverId && m.UserId == interactMemberUserId)
            .Include(m => m.Roles)
            .FirstOrDefaultAsync(cancellationToken);

        if (affectedMember == null) {
            return Errors.ResourceNotFound("Server member", [
                new(nameof(CommunityServerMember.CommunityServerId), serverId.ToString()),
                new(nameof(CommunityServerMember.UserId), interactMemberUserId.ToString()),
            ]);
        }

        try {
            affectedMember.BanExpireAt = null;
            
            ServerModerationLog log = new() {
                CommunityServerId = command.ServerId,
                Action = ServerModerationAction.Unban,
                ExecutorMemberId = executorMemberId.Value,
                AffectedMember = affectedMember,
            };
            
            moderationLogRepository.Add(log);

            await unitOfWork.SaveChangesAsync(cancellationToken);

            // delete the permission cache
            await permissionsCacheService.DeleteUserAuthorizeInfo(serverId, interactMemberUserId, CancellationToken.None);
            await mediator.Publish(new ServerMemberUnbannedNotification(command.ServerId, interactMemberUserId, affectedMember.Id), CancellationToken.None);
            
            return Result.Success();
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while unbanning member.");
            return Errors.UnexpectedError();
        }
    }
}