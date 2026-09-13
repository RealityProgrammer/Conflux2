using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using HotChocolate.Authorization;

namespace Conflux.WebApi.GraphQL;

[QueryType, Authorize]
internal static partial class Query {
    [UseFirstOrDefault, UseProjection]
    public static IQueryable<ApplicationUser> GetUser([Service] ApplicationDbContext dbContext, Guid id) {
        return dbContext.Users.Where(u => u.Id == id);
    }
}