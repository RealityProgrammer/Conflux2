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
public static partial class ChannelQuery {
    [UseConnection(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseFiltering, UseSorting]
    public static async Task<PageConnection<Channel>> GetDirectMessageChannels(
        ClaimsPrincipal claimsPrincipal,
        QueryContext<Channel> queryContext,
        PagingArguments pagingArgs,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        var idClaim = claimsPrincipal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        return await dbContext.Channels
            .Where(c => c.Type == ChannelType.DirectMessage)
            .Include(c => c.FriendRequest)
            .Include(c => c.Conversation)
            .Where(c => c.FriendRequest!.SenderUserId == userId || c.FriendRequest.ReceiverUserId == userId)
            .OrderBy(c => c.Conversation.LatestMessageAt)
            .With(queryContext)
            .ToPageAsync(pagingArgs, cancellationToken);
    }
}