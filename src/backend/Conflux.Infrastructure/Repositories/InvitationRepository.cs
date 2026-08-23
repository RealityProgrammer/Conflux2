using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class InvitationRepository(
    ApplicationDbContext dbContext,
    TimeProvider timeProvider
) : IInvitationRepository {
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
}