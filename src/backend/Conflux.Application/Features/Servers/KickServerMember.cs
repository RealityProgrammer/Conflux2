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
    IServerMemberReadRepository memberReadRepository,
    IServerPermissionsCacheService permissionsCacheService,
    IServerModerationLogWriteRepository moderationLogWriteRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    ILogger<KickServerMemberHandler> logger
) : ICommandHandler<KickServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(KickServerMemberCommand command, CancellationToken cancellationToken) {
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

        if (member.Status != MembershipStatus.Active) {
            return Errors.ServerMemberNotActive();
        }

        if (member.Roles.Any(r => r.SpecialRoleType == SpecialRoleType.Owner)) {
            return Errors.Forbidden("Owner cannot be kicked.");
        }

        try {
            member.Status = MembershipStatus.Kicked;
            member.Roles.Clear();   // clear the roles too
            
            ServerModerationLog log = new() {
                CommunityServerId = command.ServerId,
                Action = ServerModerationAction.Kick,
                Reason = command.Reason,
                ExecutorMemberId = executorMemberId.Value,
                AffectedMember = member,
            };
            
            moderationLogWriteRepository.Add(log);

            await unitOfWork.SaveChangesAsync(cancellationToken);

            // delete the permission cache
            await permissionsCacheService.DeleteUserAuthorizeInfo(member.CommunityServerId, member.UserId, CancellationToken.None);
            await mediator.Publish(new ServerMemberKickedNotification(command.ServerId, member.UserId, member.Id), CancellationToken.None);
            
            return Result.Success();
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Error occurred while kicking member.");
            return Errors.UnexpectedError();
        }
    }
}