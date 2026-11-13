using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IInvitationRepository : IRepository<Invitation> {
    Task<Invitation?> GetPermanentInvite(Guid serverId, CancellationToken cancellationToken = default);
}