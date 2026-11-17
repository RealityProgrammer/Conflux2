using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class CommunityServerRoleRepository(
    ApplicationDbContext dbContext
) : ICommunityServerRoleRepository {
    public IQueryable<CommunityServerRole> AsQueryable() {
        return dbContext.CommunityServerRoles;
    }
    
    public void Add(CommunityServerRole role) {
        dbContext.CommunityServerRoles.Add(role);
    }

    public void Remove(CommunityServerRole role) {
        dbContext.CommunityServerRoles.Remove(role);
    }

    public async Task<bool> Delete(Guid roleId, Guid serverId) {
        return await dbContext.CommunityServerRoles
            .Where(x => x.Id == roleId && x.CommunityServerId == serverId)
            .Where(x => x.SpecialRoleType == SpecialRoleType.None)  // prevent remove special role.
            .ExecuteDeleteAsync() > 0;
    }
}