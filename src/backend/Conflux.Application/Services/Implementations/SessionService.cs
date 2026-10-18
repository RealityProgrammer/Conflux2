using StackExchange.Redis;

namespace Conflux.Application.Services.Implementations;

internal sealed class SessionService(
    IConnectionMultiplexer connectionMultiplexer
) : ISessionService {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    public async Task<Guid> CreateSession(Guid userId, string deviceInfo) {
        Guid sessionId = Guid.NewGuid();
        RedisValue hashField = sessionId.ToString();

        await _database.HashSetAsync(GetSessionsKey(userId), hashField, deviceInfo);
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
        RedisValue hashField = sessionId.ToString();
        return await _database.HashExistsAsync(GetSessionsKey(userId), hashField);
    }

    private static RedisKey GetSessionsKey(Guid userId) => $"user:{userId}:sessions";
}