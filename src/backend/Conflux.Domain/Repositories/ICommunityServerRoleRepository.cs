using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerRoleRepository : IWriteRepository<CommunityServerRole> {
    void Remove(CommunityServerRole role);
    Task<bool> Delete(Guid roleId, Guid serverId);
}