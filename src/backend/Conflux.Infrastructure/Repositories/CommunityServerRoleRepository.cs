using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class CommunityServerRoleRepository(
    ApplicationDbContext dbContext
) : ICommunityServerRoleRepository {
    public void Add(CommunityServerRole role) {
        dbContext.CommunityServerRoles.Add(role);
    }

    public async Task<bool> Delete(Guid roleId, Guid serverId) {
        return await dbContext.CommunityServerRoles
            .Where(x => x.Id == roleId && x.CommunityServerId == serverId)
            .ExecuteDeleteAsync() > 0;
    }
}