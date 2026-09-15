using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Conflux.WebApi.GraphQL.Attributes;
using GreenDonut.Data;
using HotChocolate.Authorization;
using HotChocolate.Types.Pagination;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType, Authorize]
internal static partial class ServerModerationLogQuery {
    [RequireServerPermissions(ServerPermission.ReadModerationLogs)]
    [UseConnection(IncludeTotalCount = true, DefaultPageSize = 20, MaxPageSize = 50), UseFiltering, UseSorting]
    public static async Task<PageConnection<ServerModerationLog>> GetServerModerationLogs(
        Guid serverId,
        PagingArguments pagingArgs,
        QueryContext<ServerModerationLog> queryContext,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        return await dbContext.ServerModerationLogs
            .Where(m => m.CommunityServerId == serverId)
            .OrderBy(m => m.Id)
            .With(queryContext)
            .ToPageAsync(pagingArgs, cancellationToken);
    }
}