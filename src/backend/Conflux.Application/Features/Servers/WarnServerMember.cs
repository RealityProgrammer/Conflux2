using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record WarnServerMemberCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid InteractingMemberId,
    string? Reason
) : ICommand<Result>, IServerMemberInteractCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [
        ServerPermission.ManageMembers,
        ServerPermission.WarnMembers,
    ];
}

public sealed class WarnServerMemberValidationPipeline : IPipelineBehavior<WarnServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(
        WarnServerMemberCommand message, 
        MessageHandlerDelegate<WarnServerMemberCommand, Result> next, 
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

public sealed record ServerMemberWarnedNotification(
    Guid ServerId, 
    Guid WarnedMemberUserId, 
    Guid WarnedMemberId
) : INotification;

public sealed class WarnServerMemberHandler(
    IServerMemberReadRepository memberReadRepository,
    IServerModerationLogWriteRepository moderationLogWriteRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator,
    ILogger<WarnServerMemberCommand> logger
) : ICommandHandler<WarnServerMemberCommand, Result> {
    public async ValueTask<Result> Handle(WarnServerMemberCommand command, CancellationToken cancellationToken) {
        var executorMemberId = memberReadRepository.AsQueryable()
            .AsNoTracking()
            .Where(m => m.CommunityServerId == command.ServerId && m.UserId == command.ExecutorUserId)
            .Select(m => m.Id)
            .Cast<Guid?>()
            .FirstOrDefault();

        if (!executorMemberId.HasValue) {
            return Errors.ResourceNotFound($"Community server member (CommunityServerId = {command.ServerId}, UserId = {command.ExecutorUserId})");
        }
        
        CommunityServerMember? affectedMember = await memberReadRepository.AsQueryable()
            .Where(m => m.CommunityServerId == command.ServerId && m.Id == command.InteractingMemberId)
            .Include(m => m.Roles)
            .FirstOrDefaultAsync(cancellationToken);

        if (affectedMember == null) {
            return Errors.ResourceNotFound($"Community server member (CommunityServerId = {command.ServerId}, Id = {command.InteractingMemberId})");
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
            logger.LogError(e, "Error occurred while warning member.");
            return Errors.UnexpectedError();
        }
    }
}