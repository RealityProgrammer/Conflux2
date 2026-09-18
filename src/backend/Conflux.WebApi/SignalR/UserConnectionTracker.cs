using StackExchange.Redis;

namespace Conflux.WebApi.SignalR;

public sealed class UserConnectionTracker(IConnectionMultiplexer connectionMultiplexer) {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task AddConnectionAsync(Guid userId, string connectionId) {
        var key = GetUserKey(userId);
        await _database.SetAddAsync(key, connectionId);
        
        await _database.KeyExpireAsync(key, TimeSpan.FromHours(6)); 
    }

    public async Task RemoveConnectionAsync(Guid userId, string connectionId) {
        var key = GetUserKey(userId);
        await _database.SetRemoveAsync(key, connectionId);
    }

    public async Task<List<string>> GetConnectionsAsync(Guid userId) {
        var key = GetUserKey(userId);
        var members = await _database.SetMembersAsync(key);
        
        return members.Select(v => v.ToString()).ToList();
    }

    private static string GetUserKey(Guid userId) {
        return $"SignalR:connections:user:{userId}";
    }
}