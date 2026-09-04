using Conflux.Domain.Entities;
using Conflux.Infrastructure;

namespace Conflux.WebApi.GraphQL;

partial class Query {
    [UseProjection]
    public IQueryable<ApplicationUser> GetUsers([Service] ApplicationDbContext dbContext) {
        return dbContext.Users;
    }
    
    [UseFirstOrDefault, UseProjection]
    public IQueryable<ApplicationUser> GetUserById([Service] ApplicationDbContext dbContext, Guid id) {
        return dbContext.Users.Where(u => u.Id == id);
    }
}