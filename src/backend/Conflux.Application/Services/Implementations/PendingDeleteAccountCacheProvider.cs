using Conflux.Domain.Repositories;
using StackExchange.Redis;

namespace Conflux.Application.Services.Implementations;

internal sealed class PendingDeleteAccountCacheProvider(
    IConnectionMultiplexer connectionMultiplexer,
    IUserAccountDeletionReadRepository userAccountDeletionReadRepository
) : IPendingDeleteAccountCacheProvider {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    public async Task<bool?> IsDeleting(Guid userId) {
        RedisValue value = await _database.HashGetAsync("account:pending_delete", userId.ToString());
        return value.IsNullOrEmpty ? null : (bool)value;
    }

    public async Task Set(Guid userId, bool isDeleting) {
        await _database.HashFieldSetAndSetExpiryAsync(
            "account:pending_delete", 
            userId.ToString(), 
            isDeleting, 
            expiry: TimeSpan.FromMinutes(5)
        );
    }

    public async Task Remove(Guid userId) {
        await _database.HashDeleteAsync("account:pending_delete", userId.ToString());
    }

    public async Task<bool> Check(Guid userId, CancellationToken cancellationToken = default) {
        RedisValue value = await _database.HashGetAsync("account:pending_delete", userId.ToString());

        if (value.HasValue) {
            return (bool)value;
        }
        
        bool hasPendingDelete = await userAccountDeletionReadRepository.HasPendingDelete(userId, cancellationToken);
        await Set(userId, hasPendingDelete);

        return hasPendingDelete;
    }
}