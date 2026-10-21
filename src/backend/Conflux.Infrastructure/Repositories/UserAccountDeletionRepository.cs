using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class UserAccountDeletionRepository(
    ApplicationDbContext dbContext,
    TimeProvider timeProvider
) : IUserAccountDeletionReadRepository, IUserAccountDeletionWriteRepository {
    public IQueryable<UserAccountDeletion> AsQueryable() {
        return dbContext.UserAccountDeletions;
    }

    public void Add(UserAccountDeletion value) {
        dbContext.UserAccountDeletions.Add(value);
    }

    public async Task<AccountDeletionStatus> GetDeletionStatus(Guid userId, CancellationToken cancellationToken = default) {
        var deletion = await dbContext.UserAccountDeletions
            .AsNoTracking()
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.CreatedAt) // gets the most recent deletion attempt only
            .Select(d => new { d.Status, d.CreatedAt })
            .FirstOrDefaultAsync(cancellationToken);
        
        if (deletion == null) {
            return AccountDeletionStatus.None;
        }
        
        switch (deletion.Status) {
            case UserAccountDeleteStatus.Deleted:
                return AccountDeletionStatus.Deleted;

            case UserAccountDeleteStatus.Pending:
                var now = timeProvider.GetUtcNow();
                var expirationTime = deletion.CreatedAt.AddDays(14);

                return expirationTime <= now ? AccountDeletionStatus.Expired : AccountDeletionStatus.Pending;

            case UserAccountDeleteStatus.Canceled:
            default:
                return AccountDeletionStatus.None;
        }

    }
}