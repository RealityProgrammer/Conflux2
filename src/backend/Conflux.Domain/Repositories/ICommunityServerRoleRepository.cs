using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerRoleRepository : IWriteRepository<CommunityServerRole> {
    Task<CommunityServerRole?> FindById(Guid roleId, bool tracking = true, CancellationToken cancellationToken = default);
    Task<CommunityServerRole?> GetDefaultRole(Guid serverId, bool tracking = true, CancellationToken cancellationToken = default);
    
    Task<bool> Delete(Guid roleId, Guid serverId);
}