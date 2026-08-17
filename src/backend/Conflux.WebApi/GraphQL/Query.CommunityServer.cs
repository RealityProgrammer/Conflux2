using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL;

partial class Query {
    [UseProjection]
    [Authorize]
    public IQueryable<CommunityServer> GetJoinedServers(
        ClaimsPrincipal claimsPrincipal,
        [Service] ApplicationDbContext dbContext,
        int count,
        Guid? after = null
    ) {
        var idClaim = claimsPrincipal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            throw new GraphQLException(new Error {
                Message = "Invalid or missing user identification claim.",
            });
        }

        IQueryable<CommunityServerMember> query = dbContext.CommunityServerMembers
            .Where(m => m.UserId == userId);

        if (after != null) {
            query = query.Where(m => m.CommunityServerId.CompareTo(after.Value) > 0);
        }
        
        return query.Select(m => m.CommunityServer).Take(count);
    }
}