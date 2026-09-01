using Conflux.Application.Dto;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using StackExchange.Redis;
using System.Text.Json;

namespace Conflux.Application.Services.Implementations;

internal sealed class ServerPermissionsCacheService(
    IMemoryCache memoryCache,
    IConnectionMultiplexer connectionMultiplexer
) : IServerPermissionsCacheService {
    // permission cache strategy:
    // store the server's permission version in the memory cache, and then redis cache, or else return 0.
    // store member's permission in the distributed cache as normal, combine with the server's permission version number.
    // when the role is updated, increment the server's permission version count.
    // since member's version is versioned, all member would have to refetch their permission from the database, the old
    // permissions cache do nothing beside waiting to be dropped by the TTL.
    // 1. one can argue they can drop using the "*" in the key, but at the time being, i don't think IDistributedCache
    // support dropping a group of key (https://stackoverflow.com/a/55599848, since 2019, could change by now).
    // 2. redis execute commands on the main thread (single-threaded), it would have to manually going through every
    // entry and blocking other requests (Valkey might be the same but idk, gotta pick the minimal option so that it
    // can support both)
    // 3. SCAN doesn't block, but it requires the backend to collect all user ids who involves in the server, not good
    // 4. versioning might also solve concurrency issue, probably lmao
    
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<ServerMemberPermissionsDto?> GetServerMemberPermissions(
        Guid serverId, 
        Guid userId,
        CancellationToken cancellationToken = default
    ) {
        int version = await GetServerPermissionVersion(serverId);
        string cacheKey = GetCacheKeyForServerMemberPermissions(serverId, userId, version);

        byte[]? cached = (byte[]?)await _database.StringGetAsync(cacheKey);
        return cached != null ? JsonSerializer.Deserialize<ServerMemberPermissionsDto>(cached) : null;
    }

    public async Task SetServerMemberPermissions(
        Guid serverId, 
        Guid userId, 
        ServerMemberPermissionsDto value,
        CancellationToken cancellationToken = default
    ) {
        int version = await GetServerPermissionVersion(serverId);
        string cacheKey = GetCacheKeyForServerMemberPermissions(serverId, userId, version);
        
        await _database.StringSetAsync(cacheKey, JsonSerializer.SerializeToUtf8Bytes(value), TimeSpan.FromHours(1));
    }
    
    private static string GetCacheKeyForServerMemberPermissions(Guid serverId, Guid userId, int version) =>
        $"ServerPermissions:{serverId}:user:{userId}:v{version}";

    public async Task<RoleAuthorizationInfo?> GetServerDefaultRoleAuthorizationInfo(
        Guid serverId, 
        CancellationToken cancellationToken = default
    ) {
        string cacheKey = GetCacheKeyForServerDefaultRoleAuthorizationInfo(serverId);
        
        byte[]? cached = (byte[]?)await _database.StringGetAsync(cacheKey);
        return cached == null ? null : JsonSerializer.Deserialize<RoleAuthorizationInfo>(cached);
    }

    public async Task SetServerDefaultRoleAuthorizationInfo(
        Guid serverId, 
        RoleAuthorizationInfo value, 
        CancellationToken cancellationToken = default
    ) {
        string cacheKey = GetCacheKeyForServerDefaultRoleAuthorizationInfo(serverId);
        await _database.StringSetAsync(cacheKey, JsonSerializer.SerializeToUtf8Bytes(value), TimeSpan.FromHours(24));
    }

    private static string GetCacheKeyForServerDefaultRoleAuthorizationInfo(Guid serverId) =>
        $"ServerPermissions:{serverId}:default_role";

    private async Task<int> GetServerPermissionVersion(Guid serverId) {
        string memoryCacheKey = $"ServerPermissions:versions:{serverId}";
        
        // should we use a ConcurrentDictionary instead to reduce the string allocation?
        if (memoryCache.TryGetValue(memoryCacheKey, out int version)) {
            return version;
        }
        
        RedisValue redisResult = await _database.HashGetAsync("ServerPermissions:versions", serverId.ToString());
        
        version = redisResult.HasValue ? (int)redisResult : 1;
        
        memoryCache.Set(memoryCacheKey, version, TimeSpan.FromSeconds(30));
        
        return version;
    }

    public async Task IncrementServerPermissionVersion(Guid serverId, CancellationToken cancellationToken = default) {
        string memoryCacheKey = $"ServerPermissions:versions:{serverId}";

        if (!memoryCache.TryGetValue(memoryCacheKey, out int oldVersion)) {
            RedisValue redisResult = await _database.HashGetAsync("ServerPermissions:versions", serverId.ToString());
            oldVersion = redisResult.HasValue ? (int)redisResult : 1;
        }
        
        memoryCache.Set(memoryCacheKey, oldVersion + 1, TimeSpan.FromSeconds(30));
        await _database.HashSetAsync("ServerPermissions:versions", serverId.ToString(), oldVersion + 1);
    }
}