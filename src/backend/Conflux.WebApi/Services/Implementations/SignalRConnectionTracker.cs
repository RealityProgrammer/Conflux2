using Conflux.Application.Services;
using StackExchange.Redis;

namespace Conflux.WebApi.Services.Implementations;

public sealed partial class SignalRConnectionTracker(
    IConnectionMultiplexer connectionMultiplexer,
    TimeProvider timeProvider,
    ILogger<SignalRConnectionTracker> logger,
    IServiceProvider serviceProvider
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

    public async Task PruneConnections() {
        long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        
        // get all users whose last heartbeat is older than NOW
        var expiredUserIds = await _database.SortedSetRangeByScoreAsync("presence:active_users", start: 0, stop: now - 1);
        
        if (expiredUserIds.Length > 0) {
            using var scope = serviceProvider.CreateScope();
            var presenceService = scope.ServiceProvider.GetRequiredService<IPresenceService>();

            foreach (RedisValue redisVal in expiredUserIds) {
                if (Guid.TryParse(redisVal.ToString(), out var userId)) {
                    var userConnectionsKey = GetConnectionsKey(userId);
                    
                    // double check just to be safe
                    await _database.SortedSetRemoveRangeByScoreAsync(userConnectionsKey, 0, now - 1);
                    long activeConnections = await _database.SortedSetLengthAsync(userConnectionsKey);

                    if (activeConnections == 0) {
                        await presenceService.UserDisconnected(userId);
                        await _database.SortedSetRemoveAsync("presence:active_users", redisVal);
                        PruneConnectionForUser(logger, userId);
                    } else {
                        await _database.SortedSetAddAsync("presence:active_users", redisVal, now + TimeToLive);
                    }
                }
            }
        }
    }
    
    private async Task PruneExpiredConnections(Guid userId) {
        long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        await _database.SortedSetRemoveRangeByScoreAsync(GetConnectionsKey(userId), 0, now - 1);
    }

    private static string GetConnectionsKey(Guid userId) {
        return $"presence:connections:{userId}";
    }
    
    [LoggerMessage(LogLevel.Debug, "Prune connection for user {UserId}")]
    private static partial void PruneConnectionForUser(ILogger logger, Guid userId);
}