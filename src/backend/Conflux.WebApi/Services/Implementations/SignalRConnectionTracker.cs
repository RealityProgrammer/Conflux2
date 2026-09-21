using StackExchange.Redis;

namespace Conflux.WebApi.Services.Implementations;

public sealed class SignalRConnectionTracker(
    IConnectionMultiplexer connectionMultiplexer,
    TimeProvider timeProvider
) {
    public const int TimeToLive = 120;  // in seconds
    
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<bool> TrackConnection(Guid userId, string connectionId) {
        long expireTime = (timeProvider.GetUtcNow() + TimeSpan.FromSeconds(TimeToLive)).ToUnixTimeSeconds();
        var userConnectionsKey = GetConnectionsKey(userId);
        
        // if anything happen, check if React strictmode cause race-condition
        await _database.SortedSetAddAsync(userConnectionsKey, connectionId, expireTime);
        await _database.SortedSetAddAsync("presence:active_users", userId.ToString(), expireTime);
        
        await PruneExpiredConnections(userId);
        
        // likely to be hit with react strict-mode race-condition here, caused by useEffect invoked twice
        long count = await _database.SortedSetLengthAsync(userConnectionsKey);
        return count == 1;
    }

    public async Task<bool> UntrackConnection(Guid userId, string connectionId) {
        var userConnectionsKey = GetConnectionsKey(userId);
        
        await _database.SortedSetRemoveAsync(userConnectionsKey, connectionId);
        await PruneExpiredConnections(userId);
        
        long count = await _database.SortedSetLengthAsync(userConnectionsKey);

        if (count == 0) {
            await _database.SortedSetRemoveAsync("presence:active_users", userId.ToString());
            return true;
        }

        return false;
    }
    
    public async Task Heartbeat(Guid userId, string connectionId) {
        long expireTime = (timeProvider.GetUtcNow() + TimeSpan.FromSeconds(TimeToLive)).ToUnixTimeSeconds();
        
        await _database.SortedSetAddAsync(GetConnectionsKey(userId), connectionId, expireTime);
        await _database.SortedSetAddAsync("presence:active_users", userId.ToString(), expireTime);
    }
    
    private async Task PruneExpiredConnections(Guid userId) {
        long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        await _database.SortedSetRemoveRangeByScoreAsync(GetConnectionsKey(userId), 0, now - 1);
    }

    private static string GetConnectionsKey(Guid userId) {
        return $"presence:connections:{userId}";
    }
}