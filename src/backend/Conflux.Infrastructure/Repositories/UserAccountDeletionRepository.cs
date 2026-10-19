using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class UserAccountDeletionRepository(
    ApplicationDbContext dbContext
) : IUserAccountDeletionReadRepository, IUserAccountDeletionWriteRepository {
    public IQueryable<UserAccountDeletion> AsQueryable() {
        return dbContext.UserAccountDeletions;
    }

    public void Add(UserAccountDeletion value) {
        dbContext.UserAccountDeletions.Add(value);
    }

    public async Task<bool> HasPendingDelete(Guid userId, CancellationToken cancellationToken = default) {
        return await dbContext.UserAccountDeletions
            .Where(r => r.UserId == userId && r.Status == UserAccountDeleteStatus.Pending)
            .AnyAsync(cancellationToken);
    }
}