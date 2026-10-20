namespace Conflux.Application.Services;

public interface IPendingDeleteAccountCacheProvider {
    Task<bool?> IsDeleting(Guid userId);
    Task Set(Guid userId, bool isDeleting);
    Task Remove(Guid userId);
    Task<bool> Check(Guid userId, CancellationToken cancellationToken = default);
}