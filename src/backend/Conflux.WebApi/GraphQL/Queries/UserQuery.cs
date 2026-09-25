using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using Conflux.WebApi.Helpers;
using GreenDonut.Data;
using HotChocolate.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType, Authorize]
internal static partial class Query {
    public static async Task<ApplicationUser?> GetUser(
        Guid id,
        QueryContext<ApplicationUser> queryContext,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        return await dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .With(queryContext)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public static async Task<ApplicationUser?> GetSessionUser(
        ClaimsPrincipal claimsPrincipal,
        QueryContext<ApplicationUser > queryContext,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        var idClaim = claimsPrincipal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }
        
        return await dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .With(queryContext)
            .FirstOrDefaultAsync(cancellationToken);
    }
}