namespace Conflux.Application.Services;

public interface IUnitOfWork {
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}