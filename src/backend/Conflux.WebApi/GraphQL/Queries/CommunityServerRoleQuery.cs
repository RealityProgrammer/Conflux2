using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using GreenDonut.Data;
using HotChocolate.Authorization;
using HotChocolate.Types.Pagination;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType, Authorize]
internal static partial class CommunityServerRoleQuery {
    [UseSingleOrDefault, UseProjection]
    public static IQueryable<CommunityServerRole> GetCommunityServerRole(
        Guid id,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServerRoles.Where(r => r.Id == id);
    }

    [UseConnection(DefaultPageSize = 20, MaxPageSize = 50), UseFiltering]
    public static async Task<PageConnection<CommunityServerRole>> GetCommunityServerRoles(
        Guid serverId,
        PagingArguments pagingArgs,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        return await dbContext.CommunityServerRoles
            .Where(r => r.CommunityServerId == serverId)
            .OrderBy(r => r.AuthorizeLevel)
            .ThenBy(r => r.Id)
            .ToPageAsync(pagingArgs, cancellationToken);
    }
}