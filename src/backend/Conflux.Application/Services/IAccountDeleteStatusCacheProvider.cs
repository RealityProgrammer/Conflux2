using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IAccountDeleteStatusCacheProvider {
    Task<AccountDeletionStatus?> GetStatus(Guid userId);
    Task Set(Guid userId, AccountDeletionStatus status);
    Task Remove(Guid userId);
    Task Remove(IReadOnlyList<Guid> userIds);
    Task<AccountDeletionStatus> Check(Guid userId, CancellationToken cancellationToken = default);
}