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
            .Where(x => x.SpecialRoleType == SpecialRoleType.None)  // prevent remove special role.
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
            .Where(role => role.MemberRoles.Any(memberRole => memberRole.Member.UserId == userId))
            .Include(role => role.MemberRoles.Where(member => member.Member.UserId == userId))
            .ToListAsync(cancellationToken);
    }
    
    public async Task<CommunityServerRole?> GetDefaultRole(
        Guid serverId, 
        bool tracking = true, 
        CancellationToken cancellationToken = default
    ) {
        IQueryable<CommunityServerRole> query = dbContext.CommunityServerRoles;
        query = tracking ? query.AsTracking() : query.AsNoTracking();

        return await query
            .Where(r => r.CommunityServerId == serverId && r.SpecialRoleType == SpecialRoleType.Default)
            .FirstOrDefaultAsync(cancellationToken);
    }
}