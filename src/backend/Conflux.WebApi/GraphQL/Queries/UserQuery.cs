using Conflux.Domain.Entities;
using Conflux.Infrastructure;
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
}