using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL;

partial class Query {
    [UsePaging(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseProjection]
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
            .Where(m => m.UserId == userId && m.Status == MembershipStatus.Active)
            .OrderBy(m => m.CreatedAt)
            .Select(m => m.CommunityServer);
    }

    [UseSingleOrDefault, UseProjection]
    public IQueryable<CommunityServer> GetCommunityServerById(
        Guid id,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServers
            .Where(m => m.Id == id);
    }
}