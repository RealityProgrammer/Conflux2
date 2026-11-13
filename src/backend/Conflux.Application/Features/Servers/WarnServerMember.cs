using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics.CodeAnalysis;

namespace Conflux.Application.Features.Servers;

public sealed record WarnServerMemberCommand(
    Guid ServerId,
    Guid InteractMemberUserId,
    string? Reason
) : ICommand<Result>, IServerMemberInteractCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [
        ServerPermission.ManageMembers,
        ServerPermission.WarnMembers,
    ];
}

[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)]
public sealed class WarnServerMemberCommandValidator : AbstractValidator<WarnServerMemberCommand> {
    public WarnServerMemberCommandValidator() {
        RuleFor(c => c.Reason)
            .MaximumLength(256)
            .WithMessage(ValidationMessages.StringMaxLength);
    }
}

public sealed record ServerMemberWarnedNotification(
    Guid ServerId, 
    Guid WarnedMemberUserId, 
    Guid WarnedMemberId
) : INotification;

public sealed class WarnServerMemberHandler(
    ICurrentUserService currentUserService,
    IServerMemberRepository memberRepository,
    IServerModerationLogWriteRepository moderationLogWriteRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    ILogger<WarnServerMemberCommand> logger
) : ICommandHandler<WarnServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(WarnServerMemberCommand command, CancellationToken cancellationToken) {
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
            return Errors.Forbidden("Owner cannot be warned.");
        }
        
        try {
            ServerModerationLog log = new() {
                CommunityServerId = command.ServerId,
                Action = ServerModerationAction.Warn,
                Reason = command.Reason,
                ExecutorMemberId = executorMemberId,
                AffectedMember = affectedMember,
            };
            
            moderationLogWriteRepository.Add(log);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await mediator.Publish(new ServerMemberWarnedNotification(command.ServerId, affectedMember.UserId, affectedMember.Id), CancellationToken.None);
            
            return Result.Success();
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while warning member.");
            return Errors.UnexpectedError();
        }
    }
}