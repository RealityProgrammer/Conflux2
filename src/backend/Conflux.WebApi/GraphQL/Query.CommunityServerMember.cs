using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Conflux.WebApi.GraphQL;

partial class Query {
    [UsePaging(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseProjection, UseFiltering]
    public IQueryable<CommunityServerMember> GetCommunityServerMembersFromServerId(
        Guid serverId,
        string? search,
        [Service] ApplicationDbContext dbContext
    ) {
        IQueryable<CommunityServerMember> query = dbContext.CommunityServerMembers
            .Where(m => m.CommunityServerId == serverId);

        if (!string.IsNullOrWhiteSpace(search)) {
            if (Guid.TryParse(search, out var searchId)) {
                query = query.Where(m => m.Id == searchId);
            } else {
                query = query.Where(m =>
                    EF.Functions.ILike(m.User.UserName!, $"%{search}%") ||
                    EF.Functions.ILike(m.User.DisplayName!, $"%{search}%"));
            }
        }

        return query.OrderBy(m => m.User.DisplayName);
    }

    [UseSingleOrDefault, UseProjection]
    public IQueryable<CommunityServerMember> GetCommunityServerMemberById(
        Guid id,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServerMembers
            .Where(m => m.Id == id);
    }
}