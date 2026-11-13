using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerRoleRepository : IRepository<CommunityServerRole> {
    void Remove(CommunityServerRole role);
    Task<bool> Delete(Guid roleId, Guid serverId);
}