using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class ChannelCategoryRepository(
    ApplicationDbContext context
) : IChannelCategoryRepository {
    public void Add(ChannelCategory category) {
        context.ChannelCategories.Add(category);
    }
}