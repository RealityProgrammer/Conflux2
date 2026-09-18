using Conflux.Application.Services;
using Conflux.Domain.Exceptions;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;

namespace Conflux.Infrastructure.Repositories;

internal sealed class UnitOfWork(ApplicationDbContext dbContext) : IUnitOfWork {
    private IDbContextTransaction? _transaction;

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) {
        try {
            return await dbContext.SaveChangesAsync(cancellationToken);
        } catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation }) {
            throw new UniqueConstraintException("A database constraint was violated.", ex);
        }
    }

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default) {
        if (_transaction != null) {
            throw new InvalidOperationException("Transaction has already started.");
        }
        
        _transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
    }

    public async Task CommitAsync(CancellationToken cancellationToken = default) {
        if (_transaction != null) {
            await _transaction.CommitAsync(cancellationToken);
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task RollbackAsync(CancellationToken cancellationToken = default) {
        if (_transaction != null) {
            await _transaction.RollbackAsync(cancellationToken);
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }
}