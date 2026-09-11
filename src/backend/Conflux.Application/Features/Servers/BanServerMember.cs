using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record BanServerMemberCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid InteractingMemberId,
    string? Reason,
    TimeSpan? Duration
) : ICommand<Result>, IServerMemberInteractCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [
        ServerPermission.ManageMembers,
        ServerPermission.BanMembers,
    ];
}

public sealed class BanServerMemberValidationPipeline : IPipelineBehavior<BanServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(
        BanServerMemberCommand message, 
        MessageHandlerDelegate<BanServerMemberCommand, Result> next, 
        CancellationToken cancellationToken
    ) {
        if (message.Reason is { Length: > 256 }) {
            return Errors.ValidationErrorsOccurred(new() {
                ["reason"] = [
                    "Reason can only have maximum length of 256 characters.",
                ],
            });
        }

        if (message.Duration is { } duration && duration <= TimeSpan.Zero) {
            return Errors.ValidationErrorsOccurred(new() {
                ["duration"] = [
                    "Duration can only be greater than zero.",
                ],
            });
        }
        
        return await next(message, cancellationToken);
    }
}

public sealed record ServerMemberBannedNotification(
    Guid ServerId, 
    Guid BannedMemberUserId, 
    Guid BannedMemberId
) : INotification;

public sealed class BanServerMemberHandler(
    IServerMemberReadRepository memberReadRepository,
    IServerPermissionsCacheService permissionsCacheService,
    IServerModerationLogWriteRepository moderationLogWriteRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    ILogger<BanServerMemberCommand> logger,
    TimeProvider timeProvider
) : ICommandHandler<BanServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(BanServerMemberCommand command, CancellationToken cancellationToken) {
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

        if (member.Roles.Any(r => r.SpecialRoleType == SpecialRoleType.Owner)) {
            return Errors.Forbidden("Owner cannot be banned.");
        }

        try {
            DateTimeOffset utcNow = timeProvider.GetUtcNow();
            
            // if duration is null, it is infinite ban, thus override the BanExpireAt with maximum time.
            if (command.Duration == null) {
                member.BanExpireAt = DateTimeOffset.MaxValue;
            } else if (member.BanExpireAt == null || utcNow >= member.BanExpireAt) {
                // never been banned or ban expired, set BanExpireAt = now + duration
                member.BanExpireAt = utcNow + command.Duration;
            } else {
                // add duration to BanExpireAt
                member.BanExpireAt += command.Duration;
            }
            
            ServerModerationLog log = new() {
                Action = ServerModerationAction.Ban,
                Reason = command.Reason,
                BanDuration = command.Duration,
                ExecutorMemberId = executorMemberId.Value,
                AffectedMember = member,
            };
            
            moderationLogWriteRepository.Add(log);

            await unitOfWork.SaveChangesAsync(cancellationToken);

            // delete the permission cache
            await permissionsCacheService.DeleteUserAuthorizeInfo(member.CommunityServerId, member.UserId, CancellationToken.None);
            await mediator.Publish(new ServerMemberBannedNotification(command.ServerId, member.UserId, member.Id), CancellationToken.None);
            
            return Result.Success();
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Error occurred while banning member.");
            return Errors.UnexpectedError();
        }
    }
}