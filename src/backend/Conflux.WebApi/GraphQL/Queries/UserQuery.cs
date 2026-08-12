using Conflux.Domain.Entities;
using Conflux.Infrastructure;

namespace Conflux.WebApi.GraphQL.Queries;

public sealed class UserQuery {
    [UseProjection]
    public IQueryable<ApplicationUser> GetUsers([Service] ApplicationDbContext context) {
        return context.Users;
    }
    
    [UseFirstOrDefault]
    [UseProjection]
    public IQueryable<ApplicationUser> GetUserById([Service] ApplicationDbContext context, Guid id) {
        return context.Users.Where(u => u.Id == id);
    }
}