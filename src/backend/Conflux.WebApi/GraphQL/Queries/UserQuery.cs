using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using Conflux.WebApi.Helpers;
using GreenDonut.Data;
using HotChocolate.Authorization;
using Microsoft.EntityFrameworkCore;

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
        QueryContext<ApplicationUser> queryContext,
        [Service] ICurrentUserService currentUserService,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }
        
        return await dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .With(queryContext)
            .FirstOrDefaultAsync(cancellationToken);
    }
}