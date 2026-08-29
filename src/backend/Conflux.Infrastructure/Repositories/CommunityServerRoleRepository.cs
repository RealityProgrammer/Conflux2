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

    public async Task<CommunityServerRole?> FindById(Guid roleId, bool tracking = true, CancellationToken cancellationToken = default) {
        IQueryable<CommunityServerRole> query = dbContext.CommunityServerRoles;
        query = tracking ? query.AsTracking() : query.AsNoTracking();
            
        return await query
            .Include(role => role.Permissions)
            .FirstOrDefaultAsync(role => role.Id == roleId, cancellationToken);
    }

    public async Task<bool> Delete(Guid roleId, Guid serverId) {
        return await dbContext.CommunityServerRoles
            .Where(x => x.Id == roleId && x.CommunityServerId == serverId)
            .ExecuteDeleteAsync() > 0;
    }

    public async Task<List<CommunityServerRole>> GetUserRoles(
        Guid serverId, 
        Guid userId, 
        bool tracking = true, 
        CancellationToken cancellationToken = default
    ) {
        IQueryable<CommunityServerRole> query = dbContext.CommunityServerRoles;
        query = tracking ? query.AsTracking() : query.AsNoTracking();

        return await query
            .Where(role => role.CommunityServerId == serverId)
            .Where(role => role.MembersWithRole.Any(memberRole => memberRole.Member.UserId == userId))
            .Include(role => role.MembersWithRole.Where(member => member.Member.UserId == userId))
            .ToListAsync(cancellationToken);
    }
}