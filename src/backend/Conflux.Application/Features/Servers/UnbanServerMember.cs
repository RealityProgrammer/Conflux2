using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record UnbanServerMemberCommand(
    Guid ServerId,
    Guid InteractingMemberId
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
    IServerMemberReadRepository memberReadRepository,
    IServerPermissionsCacheService permissionsCacheService,
    IServerModerationLogWriteRepository moderationLogWriteRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    ILogger<BanServerMemberCommand> logger
) : ICommandHandler<UnbanServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(UnbanServerMemberCommand command, CancellationToken cancellationToken) {
        Guid executorUserId = currentUserService.UserId!.Value;
        Guid serverId = command.ServerId;
        Guid interactingMemberId = command.InteractingMemberId;
        
        var executorMemberId = memberReadRepository.AsQueryable()
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
        
        CommunityServerMember? affectedMember = await memberReadRepository.AsQueryable()
            .Where(m => m.CommunityServerId == serverId && m.Id == interactingMemberId)
            .Include(m => m.Roles)
            .FirstOrDefaultAsync(cancellationToken);

        if (affectedMember == null) {
            return Errors.ResourceNotFound("Server member", [
                new(nameof(CommunityServerMember.CommunityServerId), serverId.ToString()),
                new(nameof(CommunityServerMember.UserId), interactingMemberId.ToString()),
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
            
            moderationLogWriteRepository.Add(log);

            await unitOfWork.SaveChangesAsync(cancellationToken);

            // delete the permission cache
            await permissionsCacheService.DeleteUserAuthorizeInfo(serverId, interactingMemberId, CancellationToken.None);
            await mediator.Publish(new ServerMemberUnbannedNotification(command.ServerId, interactingMemberId, affectedMember.Id), CancellationToken.None);
            
            return Result.Success();
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while unbanning member.");
            return Errors.UnexpectedError();
        }
    }
}