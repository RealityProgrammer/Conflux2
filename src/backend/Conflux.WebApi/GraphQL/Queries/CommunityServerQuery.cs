using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Conflux.WebApi.Helpers;
using GreenDonut.Data;
using HotChocolate.Authorization;
using HotChocolate.Types.Pagination;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType, Authorize]
internal static partial class CommunityServerQuery {
    [UseConnection(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50)]
    public static async Task<PageConnection<CommunityServer>> GetJoinedServers(
        ClaimsPrincipal claimsPrincipal,
        QueryContext<CommunityServer> queryContext,
        PagingArguments pagingArgs,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        var idClaim = claimsPrincipal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        return await dbContext.CommunityServers
            .Where(s => s.Members.Any(m => m.UserId == userId && m.Status == MembershipStatus.Active))
            .OrderBy(s => s.Id)
            .With(queryContext)
            .ToPageAsync(pagingArgs, cancellationToken);
    }

    [UseSingleOrDefault, UseProjection]
    public static IQueryable<CommunityServer> GetCommunityServer(
        Guid id,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServers
            .Where(m => m.Id == id);
    }
}