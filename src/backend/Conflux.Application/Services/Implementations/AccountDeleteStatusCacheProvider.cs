using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using StackExchange.Redis;

namespace Conflux.Application.Services.Implementations;

internal sealed class AccountDeleteStatusCacheProvider(
    IConnectionMultiplexer connectionMultiplexer,
    IUserAccountDeletionReadRepository userAccountDeletionReadRepository
) : IAccountDeleteStatusCacheProvider {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    public async Task<AccountDeletionStatus?> GetStatus(Guid userId) {
        RedisValue value = await _database.HashGetAsync("account:pending_delete", userId.ToString());
        return value.IsNullOrEmpty ? null : (AccountDeletionStatus)(int)value;
    }

    public async Task Set(Guid userId, AccountDeletionStatus status) {
        await _database.HashFieldSetAndSetExpiryAsync(
            "account:pending_delete", 
            userId.ToString(), 
            (int)status, 
            expiry: TimeSpan.FromMinutes(5)
        );
    }

    public async Task Remove(Guid userId) {
        await _database.HashDeleteAsync("account:pending_delete", userId.ToString());
    }

    public async Task Remove(IReadOnlyList<Guid> userIds) {
        await _database.HashDeleteAsync("account:pending_delete", [..userIds.Select(id => id.ToString())]);
    }

    public async Task<AccountDeletionStatus> Check(Guid userId, CancellationToken cancellationToken = default) {
        RedisValue value = await _database.HashGetAsync("account:pending_delete", userId.ToString());

        if (value.HasValue) {
            return (AccountDeletionStatus)(int)value;
        }
        
        var status = await userAccountDeletionReadRepository.GetDeletionStatus(userId, cancellationToken);
        await Set(userId, status);

        return status;
    }
}