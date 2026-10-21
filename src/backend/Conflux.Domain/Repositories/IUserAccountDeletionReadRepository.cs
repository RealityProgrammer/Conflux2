using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

namespace Conflux.Domain.Repositories;

public interface IUserAccountDeletionReadRepository : IReadRepository<UserAccountDeletion> {
    Task<AccountDeletionStatus> GetDeletionStatus(Guid userId, CancellationToken cancellationToken = default);
}