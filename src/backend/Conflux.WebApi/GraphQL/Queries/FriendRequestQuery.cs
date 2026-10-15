using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Conflux.WebApi.Helpers;
using GreenDonut.Data;
using HotChocolate.Authorization;
using HotChocolate.Types.Pagination;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType, Authorize]
public static partial class FriendRequestQuery {
    [UseConnection(DefaultPageSize = 20, MaxPageSize = 50), UseFiltering, UseSorting]
    public static async Task<PageConnection<FriendRequest>> GetFriendRequests(
        ClaimsPrincipal claimsPrincipal,
        QueryContext<FriendRequest> queryContext,
        PagingArguments pagingArgs,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        var idClaim = claimsPrincipal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        return await dbContext.FriendRequests
            .AsNoTracking()
            .Where(r => r.SenderUserId == userId || r.ReceiverUserId == userId)
            .Where(r => r.Status != FriendRequestStatus.None && r.Status != FriendRequestStatus.Canceled && r.Status != FriendRequestStatus.Rejected)
            .With(queryContext, DefaultOrder)
            .ToPageAsync(pagingArgs, cancellationToken);
        
        static SortDefinition<FriendRequest> DefaultOrder(SortDefinition<FriendRequest> sort) =>
            sort.IfEmpty(o => o.AddAscending(t => t.Id));
    }
    
    [UseConnection(DefaultPageSize = 20, MaxPageSize = 50), UseSorting]
    public static async Task<PageConnection<FriendRequest>> GetFriends(
        ClaimsPrincipal claimsPrincipal,
        QueryContext<FriendRequest> queryContext,
        PagingArguments pagingArgs,
        string? nameFilter,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        var idClaim = claimsPrincipal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        var query = dbContext.FriendRequests
            .AsNoTracking()
            .Where(r => r.SenderUserId == userId || r.ReceiverUserId == userId)
            .Where(r => r.Status == FriendRequestStatus.Accepted);

        if (!string.IsNullOrEmpty(nameFilter)) {
            var pattern = $"%{nameFilter}%";
            query = query.Where(r => 
                r.SenderUserId == userId && (EF.Functions.ILike(r.Receiver.UserName!, pattern) || EF.Functions.ILike(r.Receiver.DisplayName!, pattern)) ||
                r.ReceiverUserId == userId && (EF.Functions.ILike(r.Sender.UserName!, pattern) || EF.Functions.ILike(r.Sender.DisplayName!, pattern))
            );
        }

        return await query
            .With(queryContext, DefaultOrder)
            .ToPageAsync(pagingArgs, cancellationToken);
        
        static SortDefinition<FriendRequest> DefaultOrder(SortDefinition<FriendRequest> sort) =>
            sort.IfEmpty(o => o.AddAscending(t => t.Id));
    }
}