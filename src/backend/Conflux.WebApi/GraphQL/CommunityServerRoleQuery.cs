using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using HotChocolate.Authorization;

namespace Conflux.WebApi.GraphQL;

[QueryType, Authorize]
internal static partial class CommunityServerRoleQuery {
    [UseSingleOrDefault, UseProjection]
    public static IQueryable<CommunityServerRole> GetCommunityServerRole(
        Guid id,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServerRoles.Where(r => r.Id == id);
    }

    [UsePaging(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseProjection, UseFiltering]
    public static IQueryable<CommunityServerRole> GetCommunityServerRoles(
        Guid serverId,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServerRoles
            .Where(r => r.CommunityServerId == serverId)
            .OrderByDescending(r => r.AuthorizeLevel);
    }
}