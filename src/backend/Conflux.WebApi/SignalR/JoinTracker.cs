using StackExchange.Redis;

namespace Conflux.WebApi.SignalR;

public sealed class JoinTracker(IConnectionMultiplexer connectionMultiplexer) {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    public async Task IncrementChannelJoinCount(string connectionId, Guid channelId) {
        var key = GetChannelKey(connectionId);
        
        await _database.HashIncrementAsync(key, channelId.ToString());
        await _database.KeyExpireAsync(key, TimeSpan.FromHours(24));
    }

    public async Task DecrementChannelJoinCount(string connectionId, Guid channelId) {
        var key = GetChannelKey(connectionId);
        string channelIdString = channelId.ToString();
        
        long count = await _database.HashDecrementAsync(key, channelIdString);

        if (count <= 0) {
            await _database.HashDeleteAsync(key, channelIdString);
        }
    }

    public async Task IncrementServerJoinCount(string connectionId, Guid serverId) {
        var key = GetServerKey(connectionId);

        await _database.HashIncrementAsync(key, serverId.ToString());
        await _database.KeyExpireAsync(key, TimeSpan.FromHours(24));
    }
    
    public async Task DecrementServerJoinCount(string connectionId, Guid serverId) {
        var key = GetServerKey(connectionId);
        string serverIdString = serverId.ToString();
        
        long count = await _database.HashDecrementAsync(key, serverIdString);

        if (count <= 0) {
            await _database.HashDeleteAsync(key, serverIdString);
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