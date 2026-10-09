using StackExchange.Redis;

namespace Conflux.Application.Services.Implementations;

internal sealed class ServerRoleVersioningService(
    IConnectionMultiplexer connectionMultiplexer
) : IServerRoleVersioningService {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    private static readonly TimeSpan Expire = TimeSpan.FromHours(6);

    private readonly LuaScript _getScript = LuaScript.Prepare(
        """
        local value = redis.call("HGET", @Key, "roleVersion")
        if value then
            redis.call("HEXPIRE", @Key, @Ttl, "NX", "FIELDS", 1, "roleVersion")
            return value
        end
        
        return nil
        """
    );
    
    public async Task<int> Get(Guid serverId) {
        var result = await _database.ScriptEvaluateAsync(_getScript, new GetParameters($"server:{serverId}", (int)Expire.TotalSeconds));
        return result.IsNull ? 0 : (int)result;
    }

    public async Task<int> Increment(Guid serverId) {
        return (int)await _database.HashIncrementAsync($"server:{serverId}", "roleVersion");
    }

    private sealed record GetParameters(string Key, int Ttl);
}