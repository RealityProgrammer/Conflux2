using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IUserAccountDeletionReadRepository : IReadRepository<UserAccountDeletion> {
    Task<Result<AccountDeletionDetails>> GetDeletionDetails(Guid userId, CancellationToken cancellationToken = default);
}