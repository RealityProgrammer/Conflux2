using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using Microsoft.AspNetCore.Authorization;

namespace Conflux.WebApi.GraphQL;

partial class Query {
    [Authorize]
    [UseProjection]
    public IQueryable<ApplicationUser> GetUsers([Service] ApplicationDbContext dbContext) {
        return dbContext.Users;
    }
    
    [Authorize]
    [UseFirstOrDefault]
    [UseProjection]
    public IQueryable<ApplicationUser> GetUserById([Service] ApplicationDbContext dbContext, Guid id) {
        return dbContext.Users.Where(u => u.Id == id);
    }
}