using Conflux.Application.Dto;
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

    public async Task SetManualStatuses(IReadOnlyDictionary<Guid, PresenceStatus> statuses) {
        IBatch batch = _database.CreateBatch();
        List<Task<bool>> tasks = new(statuses.Count);
        
        foreach ((Guid userId, PresenceStatus status) in statuses) {
            var task = batch.StringSetAsync($"presence:manual:{userId}", (int)status, TimeSpan.FromDays(7));
            tasks.Add(task);
        }

        batch.Execute();
        await Task.WhenAll(tasks);
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
    
    public async Task<PresenceStatus?> GetEffectiveStatus(Guid userId) {
        var val = await _database.StringGetAsync($"presence:effective:{userId}");
        return val.HasValue ? (PresenceStatus)(int)val : null;
    }

    public async Task<IReadOnlyDictionary<Guid, PresenceStatus?>> GetEffectiveStatuses(IReadOnlyList<Guid> userIds) {
        var keys = userIds.Select(id => (RedisKey)$"presence:effective:{id}").ToArray();
        var vals = await _database.StringGetAsync(keys);
        
        var dict = new Dictionary<Guid, PresenceStatus?>();
        for (int i = 0; i < userIds.Count; i++) {
            dict[userIds[i]] = vals[i].HasValue ? (PresenceStatus)(int)vals[i] : null;
        }
        return dict;
    }

    public async Task SetEffectiveStatus(Guid userId, PresenceStatus status) {
        await _database.StringSetAsync($"presence:effective:{userId}", (int)status, TimeSpan.FromMinutes(15));
    }

    public async Task SetEffectiveStatuses(IReadOnlyDictionary<Guid, PresenceStatus> statuses) {
        var batch = _database.CreateBatch();
        var tasks = statuses.Select(kvp => 
            batch.StringSetAsync($"presence:effective:{kvp.Key}", (int)kvp.Value, TimeSpan.FromMinutes(15))
        ).ToList();

        batch.Execute();
        await Task.WhenAll(tasks);
    }
    
    public async Task<IReadOnlyDictionary<Guid, RawPresenceDataDto>> GetRawPresenceData(IReadOnlyList<Guid> userIds) {
        var batch = _database.CreateBatch();
        var tasks = new List<(Guid UserId, Task<bool> IsConnected, Task<RedisValue> Manual, Task<RedisValue> Session)>();

        foreach (var userId in userIds) {
            Task<bool> isConnected = batch.KeyExistsAsync($"presence:connections:{userId}");
            Task<RedisValue> manualTask = batch.StringGetAsync($"presence:manual:{userId}");
            Task<RedisValue> sessionTask = batch.StringGetAsync($"presence:session:{userId}");
            
            tasks.Add((
                userId,
                isConnected,
                manualTask,
                sessionTask
            ));
        }

        batch.Execute(); // execute all commands in batch (high quality code right here, folk)
        
        var result = new Dictionary<Guid, RawPresenceDataDto>();
        foreach (var t in tasks) {
            // this hurt me, but i'll refactor it later, i promise lmao
            var isConnected = await t.IsConnected;
            var manualVal = await t.Manual;
            var sessionVal = await t.Session;

            result[t.UserId] = new(
                isConnected,
                manualVal.HasValue ? (PresenceStatus)(int)manualVal : null,
                sessionVal.HasValue ? (PresenceStatus)(int)sessionVal : null
            );
        }
        return result;
    }
}