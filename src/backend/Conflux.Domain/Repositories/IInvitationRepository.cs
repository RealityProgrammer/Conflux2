using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IInvitationRepository {
    void Add(Invitation invitation);
    Task<Invitation?> GetFromId(string invitationId, CancellationToken cancellationToken = default);
    
    Task<Result> AcceptInvitation(Guid userId, string invitationId, CancellationToken cancellationToken = default);
}