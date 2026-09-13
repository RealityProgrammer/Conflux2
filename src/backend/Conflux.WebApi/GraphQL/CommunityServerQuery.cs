using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Conflux.WebApi.Helpers;
using GreenDonut.Data;
using HotChocolate.Authorization;
using HotChocolate.Types.Pagination;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL;

[QueryType, Authorize]
internal static partial class CommunityServerQuery {
    [UseConnection(DefaultPageSize = 20, MaxPageSize = 50), UseFiltering, UseSorting]
    public static async Task<PageConnection<CommunityServer>> GetJoinedServers(
        ClaimsPrincipal claimsPrincipal,
        PagingArguments pagingArgs,
        QueryContext<CommunityServer> queryContext,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        var idClaim = claimsPrincipal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        return await dbContext.CommunityServerMembers
            .Where(m => m.UserId == userId && m.Status == MembershipStatus.Active)
            .Select(m => m.CommunityServer)
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