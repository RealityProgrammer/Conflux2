using StackExchange.Redis;

namespace Conflux.WebApi.Services.Implementations;

public sealed class SignalRConnectionTracker(
    IConnectionMultiplexer connectionMultiplexer
) : ISignalRConnectionTracker {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<bool> TrackConnection(Guid userId, string connectionId) {
        var key = GetKey(userId);
        
        // React StrictMode double invocation can hit this code funny
        const string script = 
            """
            local countBefore = redis.call('SCARD', KEYS[1])
            redis.call('SADD', KEYS[1], ARGV[1])
            redis.call('EXPIRE', KEYS[1], ARGV[2])
            return countBefore
            """;
        
        var result = await _database.ScriptEvaluateAsync(
            script,
            keys: [key],
            values: [connectionId, (int)TimeSpan.FromHours(6).TotalSeconds]
        );
        
        return (int)result == 0;
    }

    public async Task<bool> UntrackConnection(Guid userId, string connectionId) {
        var key = GetKey(userId);

        const string script =
            """
            redis.call('SREM', KEYS[1], ARGV[1])
            return redis.call('SCARD', KEYS[1])
            """;
        
        var setCount = await _database.ScriptEvaluateAsync(
            script,
            keys: [key],
            values: [connectionId]
        );
        
        if ((int)setCount == 0) {
            await _database.KeyDeleteAsync(key);
            return true;
        }

        return false;
    }

    private static string GetKey(Guid userId) {
        return $"presence:connections:{userId}";
    }
}