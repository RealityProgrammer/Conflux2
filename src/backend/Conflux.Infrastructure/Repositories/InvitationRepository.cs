using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class InvitationRepository(
    ApplicationDbContext dbContext
) : IInvitationRepository {
    public void Add(Invitation invitation) {
        dbContext.Invitations.Add(invitation);
    }
}