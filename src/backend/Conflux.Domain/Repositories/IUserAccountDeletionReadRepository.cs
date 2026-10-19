using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IUserAccountDeletionReadRepository : IReadRepository<UserAccountDeletion> {
    Task<bool> HasPendingDelete(Guid userId, CancellationToken cancellationToken = default);
}