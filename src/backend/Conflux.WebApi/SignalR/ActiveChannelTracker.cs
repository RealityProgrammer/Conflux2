using StackExchange.Redis;

namespace Conflux.WebApi.SignalR;

public sealed class ActiveChannelTracker(
    IConnectionMultiplexer connectionMultiplexer
) {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    private string GetKey(string connectionId) {
        return $"active_channels:{connectionId}";
    }

    public async Task AddActiveChannel(string connectionId, string channelId) {
        var key = GetKey(connectionId);
        
        await _database.HashIncrementAsync(key, channelId);
        await _database.KeyExpireAsync(key, TimeSpan.FromHours(24));
    }

    public async Task RemoveActiveChannel(string connectionId, string channelId) {
        var key = GetKey(connectionId);
        
        long count = await _database.HashDecrementAsync(key, channelId);

        if (count < 0) {
            await _database.HashDeleteAsync(key, channelId);
        }
    }

    public async Task<bool> IsChannelActive(string connectionId, string channelId) {
        return await _database.HashExistsAsync(GetKey(connectionId), channelId);
    }

    public async Task DeleteAllActiveChannels(string connectionId) {
        await _database.KeyDeleteAsync(GetKey(connectionId));
    }
}