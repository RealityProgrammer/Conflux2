using Conflux.Application.Services;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Users;

public sealed class PruneRequestDeleteAccountsCommand : ICommand;

public sealed class PruneRequestDeleteAccountsHandler(
    IUserAccountDeletionReadRepository userAccountDeletionReadRepository,
    IUserAccountDeletionWriteRepository userAccountDeletionWriteRepository,
    IUserRepository userRepository,
    TimeProvider timeProvider,
    IAccountDeleteStatusCacheProvider accountDeleteStatusCacheProvider,
    IUserMediaService userMediaService,
    ISessionService sessionService
) : ICommandHandler<PruneRequestDeleteAccountsCommand> {
    private static readonly TimeSpan GracePeriodDuration = TimeSpan.FromDays(14);
    
    public async ValueTask<Unit> Handle(PruneRequestDeleteAccountsCommand command, CancellationToken cancellationToken) {
        var now = timeProvider.GetUtcNow();
        
        // gather ids in batch of 512 rows at once.
        var expiredIds = await userAccountDeletionReadRepository
            .AsQueryable()
            .Where(u => u.Status == UserAccountDeleteStatus.Pending && u.CreatedAt + GracePeriodDuration <= now)
            .Select(u => new { u.Id, u.UserId })
            .Take(512)
            .ToListAsync(cancellationToken);

        if (expiredIds.Count == 0) return Unit.Value;
        
        // extract ids
        List<Guid> expiredUserIds = [.. expiredIds.Select(ids => ids.UserId)];
        List<Guid> deleteRequestIds = [.. expiredIds.Select(ids => ids.Id)];

        // delete physical avatar and banner files on file storage
        await userMediaService.Purge(expiredUserIds, cancellationToken);
        
        // purge user data (must be after media removal)
        await userRepository.AnonymizeUsers(expiredUserIds, cancellationToken);
        
        // update the user account deletions
        await userAccountDeletionWriteRepository
            .AsQueryable()
            .Where(d => deleteRequestIds.Contains(d.Id))
            .ExecuteUpdateAsync(builder => {
                builder
                    .SetProperty(d => d.Status, UserAccountDeleteStatus.Deleted)
                    .SetProperty(d => d.AppliedAt, now);
            }, cancellationToken);
        
        // delete pending cache
        await accountDeleteStatusCacheProvider.Remove(expiredUserIds);
        
        // delete sessions
        await sessionService.RemoveAllSession(expiredUserIds);

        return Unit.Value;
    }
}