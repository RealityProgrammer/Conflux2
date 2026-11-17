using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class InvitationRepository(
    ApplicationDbContext dbContext
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
}