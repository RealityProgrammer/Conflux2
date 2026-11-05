using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record LeaveServerCommand(Guid ServerId) : ICommand<Result>;

public sealed record UserLeftServerNotification(Guid ServerId, Guid MemberUserId, Guid MemberId) : INotification;

public sealed class LeaveServerCommandHandler(
    ICurrentUserService currentUserService,
    IServerMemberReadRepository memberReadRepository,
    ICommunityServerRoleRepository serverRoleRepository,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<LeaveServerCommandHandler> logger
) : ICommandHandler<LeaveServerCommand, Result> {
    public async ValueTask<Result> Handle(LeaveServerCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        Guid serverId = command.ServerId;
        
        CommunityServerMember? member = await memberReadRepository.AsQueryable()
            .Where(r => r.CommunityServerId == serverId && r.UserId == userId)
            .Include(r => r.Roles)
            .FirstOrDefaultAsync(cancellationToken);
        
        if (member == null) {
            return Errors.ResourceNotFound("Server member", [
                new(nameof(CommunityServerMember.CommunityServerId), serverId.ToString()),
                new(nameof(CommunityServerMember.UserId), userId.ToString()),
            ]);
        }

        if (member.Roles.Any(r => r.SpecialRoleType == SpecialRoleType.Owner)) {
            return Errors.Forbidden("Owner cannot leave server.");
        }
        
        var defaultRole = await serverRoleRepository
            .AsQueryable()
            .Where(r => r.CommunityServerId == serverId && r.SpecialRoleType == SpecialRoleType.Default)
            .SingleAsync(cancellationToken);

        member.Status = MembershipStatus.Left;
        member.HighestAuthorizeRole = defaultRole;
        member.HighestAuthorizeLevel = defaultRole.AuthorizeLevel;

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while trying to leave server.");
            return Errors.UnexpectedError();
        }

	await publisher.Publish(new UserLeftServerNotification(serverId, userId, member.Id), CancellationToken.None);

        return Result.Success();
    }
}
