using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class ServerMemberRepository(
    ApplicationDbContext dbContext
) : IServerMemberReadRepository, IServerMemberWriteRepository {
    public IQueryable<CommunityServerMember> AsQueryable() {
        return dbContext.CommunityServerMembers;
    }
    
    public void Add(CommunityServerMember value) {
        dbContext.CommunityServerMembers.Add(value);
    }

    public async Task<bool> IsUserJoined(
        Guid userId, 
        Guid serverId, 
        CancellationToken cancellationToken = default
    ) {
        return await dbContext.CommunityServerMembers
            .AnyAsync(m => m.CommunityServerId == serverId && m.UserId == userId, cancellationToken);
    }
}