using Conflux.Application.Services;
using Conflux.Domain.Exceptions;
using Npgsql;

namespace Conflux.Infrastructure.Repositories;

internal sealed class UnitOfWork(ApplicationDbContext dbContext) : IUnitOfWork {
    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) {
        try {
            return await dbContext.SaveChangesAsync(cancellationToken);
        } catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation }) {
            throw new UniqueConstraintException("A database constraint was violated.", ex);
        }
    }
}