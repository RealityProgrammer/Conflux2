using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class CommunityServerMemberRepository(
    ApplicationDbContext dbContext
) : ICommunityServerMemberRepository {
    public void Add(CommunityServerMember value) {
        dbContext.CommunityServerMembers.Add(value);
    }

    public async Task<CommunityServerRole?> GetFromId(Guid id, bool tracking = true, CancellationToken cancellationToken = default) {
        IQueryable<CommunityServerRole> query = dbContext.CommunityServerRoles;
        query = tracking ? query.AsTracking() : query.AsNoTracking();

        return await query.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
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

    public async Task<bool> IsUserJoined(Guid userId, Guid serverId, CancellationToken cancellationToken = default) {
        return await dbContext.CommunityServerMembers
            .AnyAsync(m => m.CommunityServerId == serverId && m.UserId == userId, cancellationToken);
    }

    public async Task<CommunityServerMember?> GetMemberWithRoles(Guid serverId, Guid userId, bool tracking = true, CancellationToken cancellationToken = default) {
        IQueryable<CommunityServerMember> query = dbContext.CommunityServerMembers;
        query = tracking ? query.AsTracking() : query.AsNoTracking();

        return await query
            .Where(m => m.CommunityServerId == serverId && m.UserId == userId)
            .Include(m => m.MemberRoles)
            .ThenInclude(m => m.Role)
            .ThenInclude(r => r.Permissions)
            .FirstOrDefaultAsync(cancellationToken);
    }
}