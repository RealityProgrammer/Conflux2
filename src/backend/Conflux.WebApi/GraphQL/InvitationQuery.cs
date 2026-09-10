using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using HotChocolate.Authorization;

namespace Conflux.WebApi.GraphQL;

[QueryType, Authorize]
internal static partial class InvitationQuery {
    [UseFirstOrDefault, UseProjection]
    public static IQueryable<Invitation> GetInvitation([Service] ApplicationDbContext dbContext, string id) {
        return dbContext.Invitations.Where(i => i.Id == id);
    }
}