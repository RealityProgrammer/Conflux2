using Conflux.Domain.Entities;
using Conflux.Infrastructure;

namespace Conflux.WebApi.GraphQL;

partial class Query {
    [UseFirstOrDefault, UseProjection]
    public IQueryable<Invitation> GetInvitationById([Service] ApplicationDbContext dbContext, string id) {
        return dbContext.Invitations.Where(i => i.Id == id);
    }
}