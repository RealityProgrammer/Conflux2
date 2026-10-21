using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

internal sealed partial class AccountPurgingService(
    IUserAccountDeletionReadRepository userAccountDeletionReadRepository,
    IUserAccountDeletionWriteRepository userAccountDeletionWriteRepository,
    IUserRepository userRepository,
    TimeProvider timeProvider,
    ILogger<AccountPurgingService> logger,
    IAccountDeleteStatusCacheProvider accountDeleteStatusCacheProvider,
    IUserMediaService userMediaService,
    ISessionService sessionService,
    IMediaItemWriteRepository mediaItemWriteRepository
) : IAccountPurgingService {
    public async Task PurgePendingDeleteAccounts() {
        var now = timeProvider.GetUtcNow();
        
        // gather ids in batch of 512 rows at once.
        var expiredIds = await userAccountDeletionReadRepository
            .AsQueryable()
            .Where(u => u.Status == UserAccountDeleteStatus.Pending && u.CreatedAt + TimeSpan.FromDays(14) <= now)
            .Select(u => new { u.Id, u.UserId })
            .Take(512)
            .ToListAsync();
        
        if (expiredIds.Count == 0) return;
        
        LogFound(logger, expiredIds.Count);

        // extract ids
        List<Guid> expiredUserIds = [.. expiredIds.Select(ids => ids.UserId)];
        List<Guid> deleteRequestIds = [.. expiredIds.Select(ids => ids.Id)];
        
        var userMediaPairs = await userRepository
            .AsQueryable()
            .Where(u => expiredUserIds.Contains(u.Id))
            .Select(u => new { u.AvatarId, u.BannerId })
            .ToListAsync();
        
        List<Guid> mediaIdsToDelete = [
            ..userMediaPairs
                .SelectMany(u => new[] { u.AvatarId, u.BannerId })
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
        ];
        
        // delete physical avatar and banner files on file storage
        await userMediaService.Purge(expiredUserIds);
        
        // delete media items (avatar and banners) of deleting users
        if (mediaIdsToDelete.Count > 0) {
            await mediaItemWriteRepository
                .AsQueryable()
                .Where(m => mediaIdsToDelete.Contains(m.Id))
                .ExecuteDeleteAsync();
        }
        
        // purge user data (must be after media removal)
        await userRepository.AnonymizeUsers(expiredUserIds);
        
        // update the user account deletions
        await userAccountDeletionWriteRepository
            .AsQueryable()
            .Where(d => deleteRequestIds.Contains(d.Id))
            .ExecuteUpdateAsync(builder => {
                builder
                    .SetProperty(d => d.Status, UserAccountDeleteStatus.Deleted)
                    .SetProperty(d => d.AppliedAt, now);
            });
        
        // delete pending cache
        await accountDeleteStatusCacheProvider.Remove(expiredUserIds);
        
        // delete sessions
        await sessionService.RemoveAllSession(expiredUserIds);
    }
    
    [LoggerMessage(LogLevel.Information, "Found {Count} accounts to purge.")]
    private static partial void LogFound(ILogger logger, int count);
}