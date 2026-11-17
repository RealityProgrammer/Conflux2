using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics.CodeAnalysis;

namespace Conflux.Application.Features.Servers;

public sealed record BanServerMemberCommand(
    Guid ServerId,
    Guid InteractMemberUserId,
    string? Reason,
    TimeSpan? Duration
) : ICommand<Result>, IServerMemberInteractCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [
        ServerPermission.ManageMembers,
        ServerPermission.BanMembers,
    ];
}

[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)]
public sealed class BanServerMemberCommandValidator : AbstractValidator<BanServerMemberCommand> {
    public BanServerMemberCommandValidator() {
        RuleFor(c => c.Reason)
            .MaximumLength(256)
            .WithMessage(ValidationMessages.StringMaxLength);

        RuleFor(c => c.Duration)
            .GreaterThan(TimeSpan.Zero)
            .WithMessage(ValidationMessages.TimeSpanPositive);
    }
}

public sealed record ServerMemberBannedNotification(
    Guid ServerId, 
    Guid BannedMemberUserId, 
    Guid BannedMemberId
) : INotification;

public sealed class BanServerMemberHandler(
    ICurrentUserService currentUserService,
    IServerMemberRepository memberRepository,
    IServerPermissionsCacheService permissionsCacheService,
    IServerModerationLogRepository moderationLogRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    ILogger<BanServerMemberCommand> logger,
    TimeProvider timeProvider
) : ICommandHandler<BanServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(BanServerMemberCommand command, CancellationToken cancellationToken) {
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

        if (affectedMember.Roles.Any(r => r.SpecialRoleType == SpecialRoleType.Owner)) {
            return Errors.Forbidden("Owner cannot be banned.");
        }

        try {
            DateTimeOffset utcNow = timeProvider.GetUtcNow();
            
            // if duration is null, it is infinite ban, thus override the BanExpireAt with maximum time.
            if (command.Duration == null) {
                affectedMember.BanExpireAt = DateTimeOffset.MaxValue;
            } else {
                DateTimeOffset baseTime = affectedMember.BanExpireAt == null || utcNow >= affectedMember.BanExpireAt
                    ? utcNow 
                    : affectedMember.BanExpireAt.Value;
                
                TimeSpan maxAllowedDuration = DateTimeOffset.MaxValue - baseTime;
                
                if (command.Duration.Value >= maxAllowedDuration) {
                    // clamping to MaxValue to prevent out of range exception
                    affectedMember.BanExpireAt = DateTimeOffset.MaxValue;
                } else {
                    affectedMember.BanExpireAt = baseTime + command.Duration.Value;
                }
            }
            
            ServerModerationLog log = new() {
                CommunityServerId = serverId,
                Action = ServerModerationAction.Ban,
                Reason = command.Reason,
                BanDuration = command.Duration,
                ExecutorMemberId = executorMemberId.Value,
                AffectedMember = affectedMember,
            };
            
            moderationLogRepository.Add(log);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            // delete the permission cache
            await permissionsCacheService.DeleteUserAuthorizeInfo(affectedMember.CommunityServerId, affectedMember.UserId, CancellationToken.None);
            await mediator.Publish(new ServerMemberBannedNotification(serverId, affectedMember.UserId, affectedMember.Id), CancellationToken.None);
            
            return Result.Success();
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while banning member.");
            return Errors.UnexpectedError();
        }
    }
}