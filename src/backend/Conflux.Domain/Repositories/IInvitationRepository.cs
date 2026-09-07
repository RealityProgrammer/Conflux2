using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IInvitationRepository : IWriteRepository<Invitation> {
    Task<Invitation?> GetFromId(string invitationId, CancellationToken cancellationToken = default);
    
    Task<Result> AcceptInvitation(Guid userId, string invitationId, CancellationToken cancellationToken = default);
    Task<Invitation?> GetPermanentInvite(Guid serverId, CancellationToken cancellationToken = default);
    
    Task<int> DeleteInactive(CancellationToken cancellationToken = default);
}