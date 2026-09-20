using StackExchange.Redis;

namespace Conflux.WebApi.Services.Implementations;

public sealed class SignalRConnectionTracker(
    IConnectionMultiplexer connectionMultiplexer
) : ISignalRConnectionTracker {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<bool> TrackConnection(Guid userId, string connectionId) {
        var key = GetKey(userId);
        await _database.SetAddAsync(key, connectionId);
        await _database.KeyExpireAsync(key, TimeSpan.FromHours(6)); 
        
        var count = await _database.SetLengthAsync(key);
        return count == 1;
    }

    public async Task<bool> UntrackConnection(Guid userId, string connectionId) {
        var key = GetKey(userId);
        await _database.SetRemoveAsync(key, connectionId);
        
        var count = await _database.SetLengthAsync(key);
        if (count == 0) {
            await _database.KeyDeleteAsync(key);
            return true;
        }

        return false;
    }

    private static string GetKey(Guid userId) {
        return $"presence:connections:{userId}";
    }
}