using Conflux.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Conflux.WebApi.GraphQL.DataLoaders;

public class CommunityServerMemberCountDataLoader(
    ApplicationDbContext dbContext,
    IBatchScheduler batchScheduler,
    DataLoaderOptions options
) : BatchDataLoader<Guid, int>(batchScheduler, options) {
    protected override async Task<IReadOnlyDictionary<Guid, int>> LoadBatchAsync(
        IReadOnlyList<Guid> serverIds, 
        CancellationToken cancellationToken
    ) {
        var counts = await dbContext.CommunityServerMembers
            .AsNoTracking()
            .Where(m => serverIds.Contains(m.CommunityServerId))
            .GroupBy(m => m.CommunityServerId)
            .Select(g => new { ServerId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ServerId, x => x.Count, cancellationToken);

        return serverIds.ToDictionary(id => id, id => counts.GetValueOrDefault(id, 0));
    }
}