using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using Microsoft.AspNetCore.Authorization;

namespace Conflux.WebApi.GraphQL;

partial class Query {
    [Authorize]
    [UseFirstOrDefault]
    [UseProjection]
    public IQueryable<Invitation> GetInvitationById([Service] ApplicationDbContext dbContext, string id) {
        return dbContext.Invitations.Where(i => i.Id == id);
    }
}