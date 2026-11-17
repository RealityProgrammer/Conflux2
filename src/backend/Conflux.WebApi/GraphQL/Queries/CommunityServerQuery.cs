using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Conflux.WebApi.Helpers;
using GreenDonut.Data;
using HotChocolate.Authorization;
using HotChocolate.Types.Pagination;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType, Authorize]
internal static partial class CommunityServerQuery {
    [UseConnection(DefaultPageSize = 20, MaxPageSize = 50)]
    public static async Task<PageConnection<CommunityServer>> GetJoinedServers(
        QueryContext<CommunityServer> queryContext,
        PagingArguments pagingArgs,
        [Service] ICurrentUserService currentUserService,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        return await dbContext.CommunityServers
            .Where(s => s.Members.Any(m => m.UserId == userId && m.Status == MembershipStatus.Active))
            .OrderBy(s => s.Id)
            .With(queryContext)
            .ToPageAsync(pagingArgs, cancellationToken);
    }

    [UseSingleOrDefault, UseProjection]
    public static IQueryable<CommunityServer> GetCommunityServer(
        Guid id,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.CommunityServers
            .Where(m => m.Id == id);
    }
}