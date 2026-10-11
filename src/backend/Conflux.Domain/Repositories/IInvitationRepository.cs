using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IInvitationRepository : IWriteRepository<Invitation> {
    Task<Invitation?> GetPermanentInvite(Guid serverId, CancellationToken cancellationToken = default);
    
    Task<int> DeleteInactive(CancellationToken cancellationToken = default);
}