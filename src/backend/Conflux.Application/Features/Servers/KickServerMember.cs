using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record KickServerMemberCommand(
    Guid ServerId, 
    Guid InteractingMemberId,
    string? Reason
) : ICommand<Result>, IServerMemberInteractCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [
        ServerPermission.ManageMembers, 
        ServerPermission.KickMembers,
    ];
}

public sealed class KickServerMemberValidationPipeline : IPipelineBehavior<KickServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(
        KickServerMemberCommand message, 
        MessageHandlerDelegate<KickServerMemberCommand, Result> next, 
        CancellationToken cancellationToken
    ) {
        if (message.Reason is { Length: > 256 }) {
            return Errors.ValidationErrorsOccurred(new() {
                ["reason"] = [
                    "Reason can only have maximum length of 256 characters.",
                ],
            });
        }
        
        return await next(message, cancellationToken);
    }
}

public sealed record ServerMemberKickedNotification(
    Guid ServerId, 
    Guid KickedMemberUserId, 
    Guid KickedMemberId
) : INotification;

public sealed class KickServerMemberHandler(
    ICurrentUserService currentUserService,
    IServerMemberReadRepository memberReadRepository,
    IServerPermissionsCacheService permissionsCacheService,
    IServerModerationLogWriteRepository moderationLogWriteRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    ILogger<KickServerMemberHandler> logger
) : ICommandHandler<KickServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(KickServerMemberCommand command, CancellationToken cancellationToken) {
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

        if (affectedMember.Status != MembershipStatus.Active) {
            return Errors.ServerMemberNotActive();
        }

        if (affectedMember.Roles.Any(r => r.SpecialRoleType == SpecialRoleType.Owner)) {
            return Errors.Forbidden("Owner cannot be kicked.");
        }

        try {
            affectedMember.Status = MembershipStatus.Kicked;
            affectedMember.Roles.Clear();   // clear the roles too
            
            ServerModerationLog log = new() {
                CommunityServerId = command.ServerId,
                Action = ServerModerationAction.Kick,
                Reason = command.Reason,
                ExecutorMemberId = executorMemberId.Value,
                AffectedMember = affectedMember,
            };
            
            moderationLogWriteRepository.Add(log);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            // delete the permission cache
            await permissionsCacheService.DeleteUserAuthorizeInfo(affectedMember.CommunityServerId, affectedMember.UserId, CancellationToken.None);
            await mediator.Publish(new ServerMemberKickedNotification(command.ServerId, affectedMember.UserId, affectedMember.Id), CancellationToken.None);
            
            return Result.Success();
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while kicking member.");
            return Errors.UnexpectedError();
        }
    }
}