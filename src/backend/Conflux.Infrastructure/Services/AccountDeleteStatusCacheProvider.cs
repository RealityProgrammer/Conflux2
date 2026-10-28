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
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(2);
    
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    public async Task<AccountDeletionStatus?> GetStatus(Guid userId) {
        RedisValue value = await _database.HashGetAsync($"user:{{{userId}}}", "deletion_status");
        return value.IsNullOrEmpty ? null : (AccountDeletionStatus)(int)value;
    }

    public async Task Set(Guid userId, AccountDeletionStatus status) {
        await _database.HashFieldSetAndSetExpiryAsync(
            $"user:{{{userId}}}", 
            "deletion_status", 
            (int)status,
            Ttl
        );
    }

    public async Task Remove(Guid userId) {
        await _database.HashDeleteAsync($"user:{{{userId}}}", "deletion_status");
    }

    public async Task Remove(IReadOnlyList<Guid> userIds) {
        if (userIds.Count == 0) return;

        foreach (var userId in userIds) {
            await _database.HashDeleteAsync($"user:{{{userId}}}", "deletion_status", CommandFlags.FireAndForget);
        }
    }

    public async Task<AccountDeletionStatus> Check(Guid userId, CancellationToken cancellationToken = default) {
        RedisValue value = await _database.HashGetAsync($"user:{{{userId}}}", "deletion_status");

        if (value.HasValue) {
            return (AccountDeletionStatus)(int)value;
        }
        
        // Fetch status and expiration info from repository
        Result<AccountDeletionDetails> result = await userAccountDeletionReadRepository.GetDeletionDetails(userId, cancellationToken);

        if (!result.IsSuccess) {
            await Set(userId, AccountDeletionStatus.None);
            return AccountDeletionStatus.None;
        }
        
        AccountDeletionDetails details = result.Value!;
        await Set(userId, details.Status);
        return details.Status;
    }
}