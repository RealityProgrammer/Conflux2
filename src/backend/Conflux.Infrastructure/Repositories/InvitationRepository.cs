using Conflux.Application.Options;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.Extensions.Options;

namespace Conflux.Infrastructure.Repositories;

internal sealed class InvitationRepository(
    ApplicationDbContext dbContext,
    TimeProvider timeProvider,
    IOptions<InvitationOptions> invitationOptions
) : IInvitationRepository {
    private readonly InvitationOptions _options = invitationOptions.Value;

    public IQueryable<Invitation> AsQueryable() {
        return dbContext.Invitations;
    }

    public void Add(Invitation invitation) {
        dbContext.Invitations.Add(invitation);
    }

    public async Task<Invitation?> GetFromId(string invitationId, CancellationToken cancellationToken = default) {
        return await dbContext.Invitations
            .Where(i => i.Id == invitationId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<Result> AcceptInvitation(
        Guid userId,
        string invitationId,
        CancellationToken cancellationToken = default
    ) {
        var utcNow = timeProvider.GetUtcNow();

        int rowsUpdated = await dbContext.Invitations
            .Where(i => i.Id == invitationId)
            .Where(i => (i.MaxUses == null || i.CurrentUses < i.MaxUses) && (i.ExpiresAt == null || i.ExpiresAt > utcNow))
            .ExecuteUpdateAsync(s => {
                s.SetProperty(i => i.CurrentUses, i => i.CurrentUses + 1);
                s.SetProperty(i => i.LastUsedAt, utcNow);
            }, cancellationToken);

        // happy path: invitation is valid
        if (rowsUpdated > 0) {
            return Result.Success();
        }

        // life is sad
        var invite = await dbContext.Invitations
            .AsNoTracking()
            .Where(i => i.Id == invitationId)
            .FirstOrDefaultAsync(cancellationToken);

        if (invite == null) {
            return Errors.ResourceNotFound("Invitation");
        }

        if (invite.ExpiresAt.HasValue && invite.ExpiresAt.Value <= DateTime.UtcNow) {
            return Errors.ResourceExpired("Invitation");
        }

        if (invite.MaxUses.HasValue && invite.CurrentUses >= invite.MaxUses.Value) {
            return Errors.ResourceMaxUsed("Invitation");
        }

        // general fallback
        return Errors.ResourceNoLongerValid("Invitation");
    }

    public async Task<Invitation?> GetPermanentInvite(Guid serverId, CancellationToken cancellationToken = default) {
        return await dbContext.Invitations
            .Where(i => i.MaxUses == null && i.ExpiresAt == null && i.CommunityServerId == serverId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<int> DeleteInactive(CancellationToken cancellationToken = default) {
        var utcNow = timeProvider.GetUtcNow();
        var neverUsedInactiveTime = utcNow.Add(-_options.NeverUsedInactiveTimespan);
        var lastUsedInactiveTime = utcNow.Add(-_options.LastUsedInactiveTimespan);
        
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