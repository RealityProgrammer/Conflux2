using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class ChannelCategoryRepository(
    ApplicationDbContext dbContext
) : IChannelCategoryRepository {
    public IQueryable<ChannelCategory> AsQueryable() {
        return dbContext.ChannelCategories;
    }

    public void Add(ChannelCategory category) {
        dbContext.ChannelCategories.Add(category);
    }

    public async Task<bool> Delete(Guid serverId, Guid categoryId, CancellationToken cancellationToken = default) {
        // TODO: soft-deletion
        return await dbContext.ChannelCategories
            .Where(c => c.CommunityServerId == serverId && c.Id == categoryId)
            .ExecuteDeleteAsync(cancellationToken) > 0;
    }
}