using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using Microsoft.AspNetCore.Authorization;

namespace Conflux.WebApi.GraphQL;

partial class Query {
    [UseProjection, Authorize]
    public IQueryable<CommunityServerRole> GetCommunityServerRoleById(
        Guid id,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServerRoles.Where(r => r.Id == id);
    }

    [UsePaging(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseProjection, Authorize]
    public IQueryable<CommunityServerRole> GetCommunityServerRolesByServerId(
        Guid serverId,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServerRoles
            .Where(r => r.CommunityServerId == serverId)
            .OrderByDescending(r => r.AuthorizeLevel);
    }
}