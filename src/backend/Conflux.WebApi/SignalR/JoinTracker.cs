using StackExchange.Redis;

namespace Conflux.WebApi.SignalR;

public sealed class JoinTracker(
    IConnectionMultiplexer connectionMultiplexer
) {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    public async Task IncrementChannelJoinCount(string connectionId, string channelId) {
        var key = GetChannelKey(connectionId);
        
        await _database.HashIncrementAsync(key, channelId);
        await _database.KeyExpireAsync(key, TimeSpan.FromHours(24));
    }

    public async Task DecrementChannelJoinCount(string connectionId, string channelId) {
        var key = GetChannelKey(connectionId);
        
        long count = await _database.HashDecrementAsync(key, channelId);

        if (count <= 0) {
            await _database.HashDeleteAsync(key, channelId);
        }
    }

    public async Task IncrementServerJoinCount(string connectionId, string serverId) {
        var key = GetServerKey(connectionId);

        await _database.HashIncrementAsync(key, serverId);
        await _database.KeyExpireAsync(key, TimeSpan.FromHours(24));
    }
    
    public async Task DecrementServerJoinCount(string connectionId, string serverId) {
        var key = GetServerKey(connectionId);
        
        long count = await _database.HashDecrementAsync(key, serverId);

        if (count <= 0) {
            await _database.HashDeleteAsync(key, serverId);
        }
    }
    
    public async Task DeleteAllJoinCounts(string connectionId) {
        await _database.KeyDeleteAsync(GetChannelKey(connectionId));
        await _database.KeyDeleteAsync(GetServerKey(connectionId));
    }
    
    private static string GetChannelKey(string connectionId) {
        return $"SignalR:join:channels:{connectionId}";
    }

    private static string GetServerKey(string connectionId) {
        return $"SignalR:join:servers:{connectionId}";
    }
}