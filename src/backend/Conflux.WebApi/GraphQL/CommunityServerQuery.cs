using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using HotChocolate.Authorization;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL;

[QueryType, Authorize]
internal static partial class CommunityServerQuery {
    [UsePaging(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseProjection]
    public static IQueryable<CommunityServer> GetJoinedServers(
        ClaimsPrincipal claimsPrincipal,
        [Service] ApplicationDbContext dbContext
    ) {
        var idClaim = claimsPrincipal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            throw new GraphQLException(new Error {
                Message = "Invalid or missing user identification claim.",
            });
        }

        return dbContext.CommunityServerMembers
            .Where(m => m.UserId == userId && m.Status == MembershipStatus.Active)
            .OrderBy(m => m.CreatedAt)
            .Select(m => m.CommunityServer);
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