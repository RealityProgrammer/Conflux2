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
    [UseConnection(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseFiltering]
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
            .OrderBy(r => r.Id)
            .With(queryContext)
            .ToPageAsync(pagingArgs, cancellationToken);
    }
}