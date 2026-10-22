using Conflux.Application.Dto;
using Conflux.Application.Enums;
using Conflux.Application.Services;
using StackExchange.Redis;
using System.Text.Json;

namespace Conflux.Infrastructure.Services;

internal sealed class SessionService(
    IConnectionMultiplexer connectionMultiplexer,
    TimeProvider timeProvider
) : ISessionService {
    private static readonly TimeSpan InactivityTimeout = TimeSpan.FromDays(7);
    
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    private static readonly LuaScript RevokeOtherSessionsScript = LuaScript.Prepare(
        """
        local fields = redis.call('HKEYS', @key)
        for _, field in ipairs(fields) do
            if field ~= @keepSessionId then
                redis.call('HDEL', @key, field)
            end
        end
        """
    );

    public async Task<Guid> CreateSession(
        Guid userId, 
        string operatingSystemInfo, 
        string browserInfo, 
        SessionDevice device
    ) {
        Guid sessionId = Guid.NewGuid();
        
        RedisKey sessionKey = GetSessionsKey(userId);
        RedisValue hashField = sessionId.ToString();

        SessionInfo info = new(operatingSystemInfo, browserInfo, device, timeProvider.GetUtcNow().ToUnixTimeMilliseconds());

        await _database.HashSetAsync(sessionKey, hashField, JsonSerializer.Serialize(info));
        await _database.HashFieldExpireAsync(sessionKey, [hashField], InactivityTimeout);
        
        return sessionId;
    }

    public async Task<bool> RemoveSession(Guid userId, Guid sessionId) {
        RedisValue hashField = sessionId.ToString();
        return await _database.HashDeleteAsync(GetSessionsKey(userId), hashField);
    }

    public async Task RemoveAllSessions(Guid userId) {
        await _database.KeyDeleteAsync(GetSessionsKey(userId));
    }

    public async Task RemoveOtherSessions(Guid userId, Guid keepSessionId) {
        await _database.ScriptEvaluateAsync(RevokeOtherSessionsScript, new {
            key = GetSessionsKey(userId), 
            keepSessionId = keepSessionId.ToString(),
        });
    }

    public async Task RemoveAllSession(IReadOnlyList<Guid> userIds) {
        await _database.KeyDeleteAsync([..userIds.Select(GetSessionsKey)]);
    }

    public async Task<bool> IsSessionValid(Guid userId, Guid sessionId) {
        RedisKey sessionKey = GetSessionsKey(userId);
        RedisValue hashField = sessionId.ToString();
        RedisValue value = await _database.HashGetAsync(sessionKey, hashField);

        if (!value.HasValue) return false;

        SessionInfo info;
        try {
            info = JsonSerializer.Deserialize<SessionInfo>((byte[])value!)!;
        } catch {
            await _database.HashDeleteAsync(sessionKey, hashField);
            return false;
        }
        
        var lastActivity = DateTimeOffset.FromUnixTimeMilliseconds(info.LastActivityMs);
        if (timeProvider.GetUtcNow() - lastActivity > InactivityTimeout) {
            await _database.HashDeleteAsync(sessionKey, hashField);
            return false;
        }
        
        await _database.HashFieldExpireAsync(sessionKey, [hashField], InactivityTimeout);

        return true;
    }

    public async Task ResetSessionActivityTime(Guid userId, Guid sessionId) {
        RedisKey sessionKey = GetSessionsKey(userId);
        RedisValue hashField = sessionId.ToString();
        RedisValue value = await _database.HashGetAsync(sessionKey, hashField);
        
        if (!value.HasValue) return;
        
        SessionInfo info;
        try {
            info = JsonSerializer.Deserialize<SessionInfo>((byte[])value!)!;
        } catch {
            await _database.HashDeleteAsync(sessionKey, hashField);
            return;
        }

        SessionInfo overrideInfo = info with {
            LastActivityMs = timeProvider.GetUtcNow().ToUnixTimeMilliseconds(),
        };
        
        await _database.HashSetAsync(sessionKey, hashField, JsonSerializer.Serialize(overrideInfo));
        await _database.HashFieldExpireAsync(sessionKey, [hashField], InactivityTimeout);
    }

    public async Task<SessionDetails?> GetSession(Guid userId, Guid sessionId) {
        RedisKey sessionKey = GetSessionsKey(userId);
        RedisValue value = await _database.HashGetAsync(sessionKey, sessionId.ToString());
        
        if (!value.HasValue) return null;

        SessionInfo info = JsonSerializer.Deserialize<SessionInfo>((byte[])value!)!;
        return new(sessionId, info.OperatingSystemInfo, info.BrowserInfo, info.Device, info.LastActivityMs);
    }

    public async Task<List<SessionDetails>> GetSessions(Guid userId) {
        RedisKey sessionKey = GetSessionsKey(userId);
        HashEntry[] allEntries = await _database.HashGetAllAsync(sessionKey);

        return [..allEntries.Select(entry => {
            var id = Guid.Parse((string)entry.Name!);
            var info = JsonSerializer.Deserialize<SessionInfo>((byte[])entry.Value!)!;
            
            return new SessionDetails(id, info.OperatingSystemInfo, info.BrowserInfo, info.Device, info.LastActivityMs);
        })];
    }

    private static RedisKey GetSessionsKey(Guid userId) => $"user:{userId}:sessions";
}