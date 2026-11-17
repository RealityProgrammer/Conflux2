using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Conflux.Infrastructure;
using Conflux.WebApi.Helpers;
using GreenDonut.Data;
using HotChocolate.Authorization;
using HotChocolate.Types.Pagination;
using Microsoft.EntityFrameworkCore;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType, Authorize]
public static partial class FriendRequestQuery {
    [UseConnection(DefaultPageSize = 20, MaxPageSize = 50), UseFiltering, UseSorting]
    public static async Task<PageConnection<FriendRequest>> GetFriendRequests(
        QueryContext<FriendRequest> queryContext,
        PagingArguments pagingArgs,
        [Service] ICurrentUserService currentUserService,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
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
        QueryContext<FriendRequest> queryContext,
        PagingArguments pagingArgs,
        string? nameFilter,
        [Service] ICurrentUserService currentUserService,
        [Service] IFriendRequestRepository friendRequestRepository,
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        var query = friendRequestRepository
            .AsQueryable()
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