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

    public async Task<CommunityServerMember?> GetFromId(
        Guid id, 
        bool tracking = true, 
        CancellationToken cancellationToken = default
    ) {
        IQueryable<CommunityServerMember> query = dbContext.CommunityServerMembers;
        query = tracking ? query.AsTracking() : query.AsNoTracking();

        return await query.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
    }

    public async Task<bool> IsUserJoined(
        Guid userId, 
        Guid serverId, 
        CancellationToken cancellationToken = default
    ) {
        return await dbContext.CommunityServerMembers
            .AnyAsync(m => m.CommunityServerId == serverId && m.UserId == userId, cancellationToken);
    }

    public async Task<CommunityServerMember?> GetUserMemberWithRoles(
        Guid serverId, 
        Guid userId, 
        bool tracking = true, 
        CancellationToken cancellationToken = default
    ) {
        IQueryable<CommunityServerMember> query = dbContext.CommunityServerMembers;
        query = tracking ? query.AsTracking() : query.AsNoTracking();

        return await query
            .Where(m => m.CommunityServerId == serverId && m.UserId == userId)
            .Include(m => m.MemberRoles)
            .ThenInclude(m => m.Role)
            .ThenInclude(r => r.Permissions)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<CommunityServerMember>> GetUserMembersWithRoles(
        Guid serverId,
        IReadOnlyCollection<Guid> userIds, 
        bool tracking = true, 
        CancellationToken cancellationToken = default
    ) {
        IQueryable<CommunityServerMember> query = dbContext.CommunityServerMembers;
        query = tracking ? query.AsTracking() : query.AsNoTracking();
        
        return await query
            .Where(m => m.CommunityServerId == serverId && userIds.Contains(m.UserId))
            .Include(m => m.MemberRoles)
            .ThenInclude(m => m.Role)
            .ThenInclude(r => r.Permissions)
            .ToListAsync(cancellationToken);
    }
}