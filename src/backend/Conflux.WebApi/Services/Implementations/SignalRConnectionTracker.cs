using StackExchange.Redis;

namespace Conflux.WebApi.Services.Implementations;

internal sealed class SignalRConnectionTracker(
    IConnectionMultiplexer connectionMultiplexer
) : ISignalRConnectionTracker {
    private static readonly LuaScript AddConnectionScript = LuaScript.Prepare(
        """
        redis.call("SADD", @key, @connectionId);
        return redis.call("SCARD", @key);
        """
    );

    private static readonly LuaScript RemoveConnectionScript = LuaScript.Prepare(
        """
        redis.call("SREM", @key, @connectionId);
        return redis.call("SCARD", @key);
        """
    );

    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<int> AddConnection(Guid userId, string connectionId) {
        RedisResult setCount = await _database.ScriptEvaluateAsync(AddConnectionScript, new {
            key = GetConnectionsKey(userId),
            connectionId,
        });

        return (int)setCount;
    }

    public async Task<int> RemoveConnection(Guid userId, string connectionId) {
        RedisResult setCount = await _database.ScriptEvaluateAsync(RemoveConnectionScript, new {
            key = GetConnectionsKey(userId),
            connectionId,
        });

        return (int)setCount;
    }

    public async Task<int> GetConnectionsCount(Guid userId) {
        return (int)await _database.SetLengthAsync(GetConnectionsKey(userId));
    }

    public async Task RemoveAllConnections(Guid userId) {
        await _database.KeyDeleteAsync(GetConnectionsKey(userId), CommandFlags.FireAndForget);
    }

    public async Task<List<string>> GetConnections(Guid userId) {
        return [..(await _database.SetMembersAsync(GetConnectionsKey(userId))).Select(v => (string)v!)];
    }

    public async Task PruneAllConnections() {
        var endpoint = connectionMultiplexer.GetEndPoints().First();
        var server = connectionMultiplexer.GetServer(endpoint);
        var db = connectionMultiplexer.GetDatabase();

        await foreach (var key in server.KeysAsync(pattern: "user:*:connections")) {
            db.KeyDelete(key);
        }
    }

    private static string GetConnectionsKey(Guid userId) => $"user:{{{userId}}}:connections";
}