using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using StackExchange.Redis;

namespace Conflux.Infrastructure.Services;

internal sealed class AccountDeleteStatusCacheProvider(
    IConnectionMultiplexer connectionMultiplexer,
    IUserAccountDeletionReadRepository userAccountDeletionReadRepository
) : IAccountDeleteStatusCacheProvider {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    public async Task<AccountDeletionStatus?> GetStatus(Guid userId) {
        RedisValue value = await _database.HashGetAsync("account:pending_delete", userId.ToString());
        return value.IsNullOrEmpty ? null : (AccountDeletionStatus)(int)value;
    }

    public async Task Set(Guid userId, AccountDeletionStatus status, TimeSpan? expires) {
        var expiry = TimeSpan.FromMinutes(5);

        if (status == AccountDeletionStatus.Pending && expires.HasValue) {
            var remainingTime = expires.Value;
            
            if (remainingTime > TimeSpan.Zero && remainingTime < expiry) {
                expiry = remainingTime;
            }
        }

        await _database.HashFieldSetAndSetExpiryAsync(
            "account:pending_delete", 
            userId.ToString(), 
            (int)status, 
            expiry
        );
    }

    public async Task Remove(Guid userId) {
        await _database.HashDeleteAsync("account:pending_delete", userId.ToString());
    }

    public async Task Remove(IReadOnlyList<Guid> userIds) {
        if (userIds.Count == 0) return;
        
        await _database.HashDeleteAsync("account:pending_delete", [..userIds.Select(id => id.ToString())]);
    }

    public async Task<AccountDeletionStatus> Check(Guid userId, CancellationToken cancellationToken = default) {
        RedisValue value = await _database.HashGetAsync("account:pending_delete", userId.ToString());

        if (value.HasValue) {
            return (AccountDeletionStatus)(int)value;
        }
        
        // Fetch status and expiration info from repository
        Result<AccountDeletionDetails> result = await userAccountDeletionReadRepository.GetDeletionDetails(userId, cancellationToken);

        if (!result.IsSuccess) {
            return AccountDeletionStatus.None;
        }
        
        AccountDeletionDetails details = result.Value!;
        await Set(userId, details.Status, details.ExpiryTime);
        return details.Status;
    }
}