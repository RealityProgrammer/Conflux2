using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IInvitationRepository {
    void Add(Invitation invitation);
}