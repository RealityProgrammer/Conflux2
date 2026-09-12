using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Conflux.WebApi.GraphQL.Attributes;
using HotChocolate.Authorization;
using Microsoft.EntityFrameworkCore;

namespace Conflux.WebApi.GraphQL;

[QueryType, Authorize]
internal static partial class CommunityServerMemberQuery {
    [UsePaging(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseProjection]
    public static IQueryable<CommunityServerMember> GetCommunityServerMembers(
        Guid serverId,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServerMembers
            .Where(m => m.Status == MembershipStatus.Active)
            .Where(m => m.CommunityServerId == serverId)
            .OrderBy(m => m.User.DisplayName);
    }
    
    [UsePaging(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseProjection]
    public static IQueryable<CommunityServerMember> ServerMemberSearch(
        Guid serverId,
        string? search,
        [Service] ApplicationDbContext dbContext
    ) {
        IQueryable<CommunityServerMember> query = dbContext.CommunityServerMembers
            .Where(m => m.Status == MembershipStatus.Active)
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

    [RequireServerPermissions(ServerPermission.ManageMembers)]
    [UsePaging(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseProjection]
    public static IQueryable<CommunityServerMember> ServerMemberSearchForAdmin(
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
    public static IQueryable<CommunityServerMember> GetCommunityServerMemberByServerAndUserId(
        Guid serverId,
        Guid userId,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServerMembers
            .Where(m => m.CommunityServerId == serverId && m.UserId == userId)
            .Where(m => m.Status == MembershipStatus.Active);
    }

    [UseSingleOrDefault, UseProjection]
    public static IQueryable<CommunityServerMember> GetCommunityServerMember(
        Guid id,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServerMembers
            .Where(m => m.Id == id)
            .Where(m => m.Status == MembershipStatus.Active);
    }
    
    [UseSingleOrDefault, UseProjection]
    public static IQueryable<CommunityServerMember> GetCommunityServerMemberForAdmin(
        Guid id,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServerMembers
            .Where(m => m.Id == id);
    }
}