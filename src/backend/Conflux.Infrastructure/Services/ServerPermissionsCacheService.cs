using Conflux.Application.Services;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;
using StackExchange.Redis;
using System.Text.Json;

namespace Conflux.Infrastructure.Services;

internal sealed class ServerPermissionsCacheService(
    IConnectionMultiplexer connectionMultiplexer,
    IServerMemberReadRepository memberReadRepository,
    IServerRoleVersioningService roleVersioningService,
    ILogger<ServerPermissionsCacheService> logger
) : IServerPermissionsCacheService {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<ServerMemberAuthorizeInfoDto?> GetUserAuthorizeInfo(
        Guid serverId, 
        Guid userId,
        CancellationToken cancellationToken = default
    ) {
        int version = await roleVersioningService.Get(serverId);
        string cacheKey = GetRedisKeyForUserPermissions(serverId, userId, version);

        byte[]? cached = (byte[]?)await _database.StringGetAsync(cacheKey);

        if (cached == null) {
            return null;
        }

        try {
            return JsonSerializer.Deserialize<ServerMemberAuthorizeInfoDto>(cached);
        } catch (Exception e) {
            logger.LogError(e, "Failed to deserialize cached member authorize info. Null will be returned.");
            await _database.KeyDeleteAsync(cacheKey);
            
            return null;
        }
    }

    public async Task SetUserAuthorizeInfo(
        Guid serverId, 
        Guid userId,
        ServerMemberAuthorizeInfoDto value,
        CancellationToken cancellationToken = default
    ) {
        int version = await roleVersioningService.Get(serverId);
        string cacheKey = GetRedisKeyForUserPermissions(serverId, userId, version);
        
        await _database.StringSetAsync(
            cacheKey, 
            JsonSerializer.SerializeToUtf8Bytes(value), 
            TimeSpan.FromHours(1)
        );
    }

    public async Task DeleteUserAuthorizeInfo(Guid serverId, Guid userId, CancellationToken cancellationToken = default) {
        int version = await roleVersioningService.Get(serverId);
        
        string cacheKey = GetRedisKeyForUserPermissions(serverId, userId, version);
        await _database.StringDeleteAsync(cacheKey, ValueCondition.Exists);
    }

    public async Task DeleteMemberAuthorizeInfo(Guid memberId, CancellationToken cancellationToken = default) {
        var ids = await memberReadRepository.AsQueryable()
            .AsNoTracking()
            .Where(m => m.Id == memberId)
            .Select(m => new {
                m.CommunityServerId,
                m.UserId,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (ids == null) {
            return;
        }

        await DeleteUserAuthorizeInfo(ids.CommunityServerId, ids.UserId, cancellationToken);
    }

    public async Task<Dictionary<Guid, ServerMemberAuthorizeInfoDto>> GetUsersAuthorizeInfo(
        Guid serverId, 
        IReadOnlyCollection<Guid> userIds, 
        CancellationToken cancellationToken = default
    ) {
        Dictionary<Guid, ServerMemberAuthorizeInfoDto> results = new(userIds.Count);

        foreach (var userId in userIds) {
            ServerMemberAuthorizeInfoDto? info = await GetUserAuthorizeInfo(serverId, userId, cancellationToken);

            if (info == null) {
                continue;
            }
            
            results.Add(userId, info);
        }

        return results;
    }

    public async Task SetUsersAuthorizeInfo(
        Guid serverId, 
        IReadOnlyDictionary<Guid, ServerMemberAuthorizeInfoDto> values, 
        CancellationToken cancellationToken = default
    ) {
        foreach ((var userId, ServerMemberAuthorizeInfoDto authorizeInfo) in values) {
            await SetUserAuthorizeInfo(serverId, userId, authorizeInfo, cancellationToken);
        }
    }
    
    private static string GetRedisKeyForUserPermissions(Guid serverId, Guid userId, int version) =>
        $"server:{serverId}:authorize:{userId}:v{version}";
}