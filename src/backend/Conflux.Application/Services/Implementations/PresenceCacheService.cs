using Conflux.Domain.Enums;
using StackExchange.Redis;

namespace Conflux.Application.Services.Implementations;

internal sealed class PresenceCacheService(
    IConnectionMultiplexer connectionMultiplexer
) : IPresenceCacheService {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    public async Task<bool> IsUserConnected(Guid userId) {
        string connectionsKey = $"presence:connections:{userId}";
        return await _database.KeyExistsAsync(connectionsKey);
    }

    public async Task<PresenceStatus?> GetManualStatus(Guid userId) {
        var key = $"presence:manual:{userId}";
        var val = await _database.StringGetAsync(key);
        
        return val.HasValue ? (PresenceStatus)(int)val : null;
    }
    
    public async Task SetManualStatus(Guid userId, PresenceStatus status) {
        var key = $"presence:manual:{userId}";
        await _database.StringSetAsync(key, (int)status, TimeSpan.FromDays(7));
    }

    public async Task<PresenceStatus?> GetSessionStatus(Guid userId) {
        var key = $"presence:session:{userId}";
        var val = await _database.StringGetAsync(key);
        
        return val.HasValue ? (PresenceStatus)(int)val : null;
    }
    
    public async Task SetSessionStatus(Guid userId, PresenceStatus? status) {
        var key = $"presence:session:{userId}";
        if (status == null) {
            await _database.KeyDeleteAsync(key);
        } else {
            await _database.StringSetAsync(key, (int)status, TimeSpan.FromHours(12));
        }
    }
}