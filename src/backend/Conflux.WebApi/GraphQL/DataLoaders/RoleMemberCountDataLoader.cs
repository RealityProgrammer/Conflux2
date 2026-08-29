using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Microsoft.EntityFrameworkCore;
using System.Collections.Frozen;

namespace Conflux.WebApi.GraphQL.DataLoaders;

public sealed class RoleMemberCountDataLoader(
    IDbContextFactory<ApplicationDbContext> dbContextFactory,
    IBatchScheduler batchScheduler,
    DataLoaderOptions options
) : BatchDataLoader<Guid, int>(batchScheduler, options) {
    protected override async Task<IReadOnlyDictionary<Guid, int>> LoadBatchAsync(
        IReadOnlyList<Guid> roleIds, 
        CancellationToken cancellationToken
    ) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        if (roleIds.Count == 0) {
            return FrozenDictionary<Guid, int>.Empty;
        }

        var counts = await dbContext.CommunityServerMemberRoles
            .AsNoTracking()
            .Where(r => roleIds.Contains(r.RoleId))
            .GroupBy(mr => mr.RoleId)
            .Select(g => new {
                RoleId = g.Key,
                Count = g.Count(),
            })
            .ToDictionaryAsync(x => x.RoleId, x => x.Count, cancellationToken);
        
        return roleIds.ToDictionary(id => id, id => counts.GetValueOrDefault(id, 0));
    }
}