using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL;

partial class Query {
    [UsePaging(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseProjection, Authorize]
    public IQueryable<CommunityServer> GetJoinedServers(
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
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => m.CommunityServer);
    }
}