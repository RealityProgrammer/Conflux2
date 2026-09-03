using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using Microsoft.AspNetCore.Authorization;

namespace Conflux.WebApi.GraphQL;

partial class Query {
    [UsePaging(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseProjection, Authorize]
    public IQueryable<CommunityServerMember> GetCommunityServerMembersFromServerId(
        Guid serverId,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServerMembers
            .Where(m => m.CommunityServerId == serverId)
            .OrderBy(m => m.CreatedAt);
    }

    [UseProjection, Authorize, UseSingleOrDefault]
    public IQueryable<CommunityServerMember> GetCommunityServerMemberById(
        Guid id,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServerMembers
            .Where(m => m.Id == id);
    }
}