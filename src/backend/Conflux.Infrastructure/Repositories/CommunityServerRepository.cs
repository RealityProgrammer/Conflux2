using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class CommunityServerRepository(
    ApplicationDbContext dbContext
) : ICommunityServerRepository {
    public void Add(CommunityServer communityServer) {
        dbContext.CommunityServers.Add(communityServer);
    }

    public async Task<bool> UpdateHasAvatar(Guid serverId, bool hasAvatar) {
        int changed = await dbContext.CommunityServers
            .Where(s => s.Id == serverId)
            .ExecuteUpdateAsync(setter => {
                setter.SetProperty(s => s.HasAvatar, hasAvatar);
            });
        
        return changed == 1;
    }
}