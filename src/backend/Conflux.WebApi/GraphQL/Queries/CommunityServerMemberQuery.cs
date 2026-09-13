using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Conflux.WebApi.GraphQL.Attributes;
using GreenDonut.Data;
using HotChocolate.Authorization;
using HotChocolate.Types.Pagination;
using Microsoft.EntityFrameworkCore;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType, Authorize]
internal static partial class CommunityServerMemberQuery {
    [UseConnection(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50)]
    public static async Task<PageConnection<CommunityServerMember>> GetCommunityServerMembers(
        Guid serverId,
        PagingArguments pagingArgs,
        QueryContext<CommunityServerMember> queryContext,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        return await dbContext.CommunityServerMembers
            .Where(m => m.Status == MembershipStatus.Active)
            .Where(m => m.CommunityServerId == serverId)
            .OrderBy(m => m.User.Id)
            .With(queryContext)
            .ToPageAsync(pagingArgs, cancellationToken);
    }
    
    [UseConnection(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50)]
    public static async Task<PageConnection<CommunityServerMember>> ServerMemberSearch(
        Guid serverId,
        string? search,
        PagingArguments pagingArgs,
        QueryContext<CommunityServerMember> queryContext,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
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

        return await query
            .OrderBy(m => m.User.DisplayName)
            .With(queryContext)
            .ToPageAsync(pagingArgs, cancellationToken);
    }

    [RequireServerPermissions(ServerPermission.ManageMembers)]
    [UseConnection(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50)]
    public static async Task<PageConnection<CommunityServerMember>> ServerMemberSearchForAdmin(
        Guid serverId,
        string? search,
        PagingArguments pagingArgs,
        QueryContext<CommunityServerMember> queryContext,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
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

        return await query
            .OrderBy(m => m.User.DisplayName)
            .With(queryContext)
            .ToPageAsync(pagingArgs, cancellationToken);
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