using StackExchange.Redis;

namespace Conflux.WebApi.SignalR;

public sealed class JoinTracker(IConnectionMultiplexer connectionMultiplexer) {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    public async Task IncrementConversationJoinCount(string connectionId, Guid conversationId) {
        var key = GetConversationKey(connectionId);
        
        await _database.HashIncrementAsync(key, conversationId.ToString());
        await _database.KeyExpireAsync(key, TimeSpan.FromHours(24));
    }

    public async Task DecrementConversationJoinCount(string connectionId, Guid conversationId) {
        var key = GetConversationKey(connectionId);
        string channelIdString = conversationId.ToString();
        
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
        await _database.KeyDeleteAsync(GetConversationKey(connectionId));
        await _database.KeyDeleteAsync(GetServerKey(connectionId));
    }
    
    private static string GetConversationKey(string connectionId) {
        return $"join:conversations:{connectionId}";
    }

    private static string GetServerKey(string connectionId) {
        return $"join:servers:{connectionId}";
    }
}