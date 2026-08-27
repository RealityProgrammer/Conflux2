using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerRoleRepository {
    void Add(CommunityServerRole role);

    Task<bool> Delete(Guid roleId, Guid serverId);
}