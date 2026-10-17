using Conflux.Domain.Entities;
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
}