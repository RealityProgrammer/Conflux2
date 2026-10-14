using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class InvitationRepository(
    ApplicationDbContext dbContext,
    TimeProvider timeProvider
) : IInvitationRepository {
    public IQueryable<Invitation> AsQueryable() {
        return dbContext.Invitations;
    }

    public void Add(Invitation invitation) {
        dbContext.Invitations.Add(invitation);
    }

    public async Task<Invitation?> GetPermanentInvite(Guid serverId, CancellationToken cancellationToken = default) {
        return await dbContext.Invitations
            .Where(i => i.MaxUses == null && i.ExpiresAt == null && i.CommunityServerId == serverId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<int> DeleteInactive(CancellationToken cancellationToken = default) {
        var utcNow = timeProvider.GetUtcNow();
        var neverUsedInactiveTime = utcNow.Subtract(TimeSpan.FromDays(7));
        var lastUsedInactiveTime = utcNow.Subtract(TimeSpan.FromDays(14));
        
        return await dbContext.Invitations
            .Where(i => 
                // expired
                i.ExpiresAt != null && i.ExpiresAt <= utcNow ||
                
                // maxed out usage
                i.MaxUses != null && i.CurrentUses >= i.MaxUses ||
                
                // permanent invitations that is never used
                i.ExpiresAt == null && i.CurrentUses == 0 && i.CreatedAt <= neverUsedInactiveTime ||
                
                // permanent (but has limit usage) invitations that last used surpassed the active time
                i.ExpiresAt == null && i.MaxUses != null && i.LastUsedAt <= lastUsedInactiveTime
            )
            .ExecuteDeleteAsync(cancellationToken);
    }
}