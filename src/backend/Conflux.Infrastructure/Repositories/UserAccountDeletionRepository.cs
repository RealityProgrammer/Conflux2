using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class UserAccountDeletionRepository(
    ApplicationDbContext dbContext,
    TimeProvider timeProvider
) : IUserAccountDeletionReadRepository, IUserAccountDeletionWriteRepository {
    public IQueryable<UserAccountDeletion> AsQueryable() {
        return dbContext.UserAccountDeletions;
    }

    public void Add(UserAccountDeletion value) {
        dbContext.UserAccountDeletions.Add(value);
    }

    public async Task<Result<AccountDeletionDetails>> GetDeletionDetails(Guid userId, CancellationToken cancellationToken = default) {
        var deletion = await dbContext.UserAccountDeletions
            .AsNoTracking()
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.CreatedAt) // gets the most recent deletion attempt only
            .Select(d => new { d.Status, d.CreatedAt })
            .FirstOrDefaultAsync(cancellationToken);
        
        if (deletion == null) {
            return Errors.ResourceNotFound("User Account Deletion", [
                new(nameof(UserAccountDeletion.UserId), userId.ToString()),
            ]);
        }
        
        switch (deletion.Status) {
            case UserAccountDeleteStatus.Deleted:
                return Result<AccountDeletionDetails>.Success(new(AccountDeletionStatus.Deleted, TimeSpan.Zero));

            case UserAccountDeleteStatus.Pending:
                var now = timeProvider.GetUtcNow();
                var expirationTime = deletion.CreatedAt.AddDays(14);

                var remainingTime = expirationTime - now;

                return Result<AccountDeletionDetails>.Success(new(
                    remainingTime > TimeSpan.Zero ? AccountDeletionStatus.Pending : AccountDeletionStatus.Expired, 
                    remainingTime
                ));

            case UserAccountDeleteStatus.Canceled:
            default:
                return Result<AccountDeletionDetails>.Success(new(AccountDeletionStatus.None, TimeSpan.Zero));
        }

    }
}