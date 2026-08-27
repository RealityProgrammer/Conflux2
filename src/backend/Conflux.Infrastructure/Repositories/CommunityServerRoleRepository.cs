using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class CommunityServerRoleRepository(
    ApplicationDbContext dbContext
) : ICommunityServerRoleRepository {
    public void Add(CommunityServerRole role) {
        dbContext.CommunityServerRoles.Add(role);
    }
}