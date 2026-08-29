using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using Microsoft.AspNetCore.Authorization;

namespace Conflux.WebApi.GraphQL;

partial class Query {
    [UseFirstOrDefault, UseProjection, Authorize]
    public IQueryable<Invitation> GetInvitationById([Service] ApplicationDbContext dbContext, string id) {
        return dbContext.Invitations.Where(i => i.Id == id);
    }
}