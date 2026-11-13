using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IUserAccountDeletionRepository : IRepository<UserAccountDeletion> {
    Task<Result<AccountDeletionDetails>> GetDeletionDetails(Guid userId, CancellationToken cancellationToken = default);
}