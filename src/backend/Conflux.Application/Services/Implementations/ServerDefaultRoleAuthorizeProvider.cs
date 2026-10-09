using Conflux.Application.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using System.Text.Json;

namespace Conflux.Application.Services.Implementations;

internal sealed class ServerDefaultRoleAuthorizeProvider(
    ICommunityServerRoleRepository roleRepository,
    IConnectionMultiplexer connectionMultiplexer
) : IServerDefaultRoleAuthorizeProvider {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<RoleAuthorizeInfo?> Get(Guid serverId, CancellationToken cancellationToken = default) {
        string key = $"server:{serverId}";
        byte[]? cached = (byte[]?)await _database.HashGetAsync(key, "defaultRole");

        if (cached != null) {
            return JsonSerializer.Deserialize<RoleAuthorizeInfo>(cached);
        }
        
        var info = await roleRepository
            .AsQueryable()
            .Where(r => r.CommunityServerId == serverId && r.SpecialRoleType == SpecialRoleType.Default)
            .Include(r => r.Permissions)
            .Select(m => new { m.AuthorizeLevel, m.Permissions })
            .FirstOrDefaultAsync(cancellationToken);

        if (info == null) {
            return null;
        }

        var roleAuthorizeInfo = new RoleAuthorizeInfo(
            info.AuthorizeLevel,
            info.Permissions.ToDictionary(p => p.Permission, p => p.State)
        );

        cached = JsonSerializer.SerializeToUtf8Bytes(roleAuthorizeInfo);
        await _database.HashSetAsync(key, "defaultRole", cached);

        return roleAuthorizeInfo;
    }

    public async Task Remove(Guid serverId) {
        string key = $"server:{serverId}";
        await _database.HashDeleteAsync(key, "defaultRole");
    }
}