using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record UnbanServerMemberCommand(
    Guid ExecutorUserId,
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
    IServerMemberReadRepository memberReadRepository,
    IServerPermissionsCacheService permissionsCacheService,
    IServerModerationLogWriteRepository moderationLogWriteRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    ILogger<BanServerMemberCommand> logger
) : ICommandHandler<UnbanServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(UnbanServerMemberCommand command, CancellationToken cancellationToken) {
        var executorMemberId = memberReadRepository.AsQueryable()
            .AsNoTracking()
            .Where(m => m.CommunityServerId == command.ServerId && m.UserId == command.ExecutorUserId)
            .Select(m => m.Id)
            .Cast<Guid?>()
            .FirstOrDefault();

        if (!executorMemberId.HasValue) {
            return Errors.ResourceNotFound($"Community server member (CommunityServerId = {command.ServerId}, UserId = {command.ExecutorUserId})");
        }
        
        CommunityServerMember? member = await memberReadRepository.AsQueryable()
            .Where(m => m.CommunityServerId == command.ServerId && m.Id == command.InteractingMemberId)
            .Include(m => m.Roles)
            .FirstOrDefaultAsync(cancellationToken);

        if (member == null) {
            return Errors.ResourceNotFound($"Community server member (CommunityServerId = {command.ServerId}, Id = {command.InteractingMemberId})");
        }

        try {
            member.BanExpireAt = null;
            
            ServerModerationLog log = new() {
                CommunityServerId = command.ServerId,
                Action = ServerModerationAction.Unban,
                ExecutorMemberId = executorMemberId.Value,
                AffectedMember = member,
            };
            
            moderationLogWriteRepository.Add(log);

            await unitOfWork.SaveChangesAsync(cancellationToken);

            // delete the permission cache
            await permissionsCacheService.DeleteUserAuthorizeInfo(member.CommunityServerId, member.UserId, CancellationToken.None);
            await mediator.Publish(new ServerMemberUnbannedNotification(command.ServerId, member.UserId, member.Id), CancellationToken.None);
            
            return Result.Success();
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Error occurred while unbanning member.");
            return Errors.UnexpectedError();
        }
    }
}