using Conflux.Application.Dto;
using StackExchange.Redis;
using System.Text.Json;

namespace Conflux.Application.Services.Implementations;

internal sealed class SessionService(
    IConnectionMultiplexer connectionMultiplexer,
    TimeProvider timeProvider
) : ISessionService {
    private static readonly TimeSpan InactivityTimeout = TimeSpan.FromDays(7);
    
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    public async Task<Guid> CreateSession(Guid userId, string deviceInfo) {
        Guid sessionId = Guid.NewGuid();
        RedisValue hashField = sessionId.ToString();

        SessionMetadata metadata = new(deviceInfo, timeProvider.GetUtcNow().Ticks);

        await _database.HashSetAsync(GetSessionsKey(userId), hashField, JsonSerializer.Serialize(metadata));
        return sessionId;
    }

    public async Task RemoveSession(Guid userId, Guid sessionId) {
        RedisValue hashField = sessionId.ToString();
        await _database.HashDeleteAsync(GetSessionsKey(userId), hashField);
    }

    public async Task RemoveAllSession(Guid userId) {
        await _database.KeyDeleteAsync(GetSessionsKey(userId));
    }

    public async Task<bool> IsSessionValid(Guid userId, Guid sessionId) {
        RedisKey sessionKey = GetSessionsKey(userId);
        RedisValue hashField = sessionId.ToString();
        RedisValue value = await _database.HashGetAsync(sessionKey, hashField);

        if (!value.HasValue) return false;

        SessionMetadata metadata;
        try {
            metadata = JsonSerializer.Deserialize<SessionMetadata>((string)value!)!;
        } catch {
            await _database.HashDeleteAsync(sessionKey, hashField);
            return false;
        }
        
        var lastActivity = new DateTimeOffset(metadata.LastActivityTick, TimeSpan.Zero);
        if (timeProvider.GetUtcNow() - lastActivity > InactivityTimeout) {
            await _database.HashDeleteAsync(sessionKey, hashField);
            return false;
        }

        return true;
    }

    public async Task TickleSession(Guid userId, Guid sessionId) {
        RedisKey sessionKey = GetSessionsKey(userId);
        RedisValue hashField = sessionId.ToString();
        RedisValue value = await _database.HashGetAsync(sessionKey, hashField);
        
        if (!value.HasValue) return;
        
        SessionMetadata metadata;
        try {
            metadata = JsonSerializer.Deserialize<SessionMetadata>((string)value!)!;
        } catch {
            await _database.HashDeleteAsync(sessionKey, hashField);
            return;
        }

        SessionMetadata overrideMetadata = metadata with {
            LastActivityTick = timeProvider.GetUtcNow().Ticks,
        };
        await _database.HashSetAsync(sessionKey, hashField, JsonSerializer.Serialize(overrideMetadata));
    }

    private static RedisKey GetSessionsKey(Guid userId) => $"user:{userId}:sessions";
}