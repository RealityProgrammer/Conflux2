using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class MediaItemRepository(
    ApplicationDbContext context
) : IMediaItemReadRepository, IMediaItemWriteRepository {
    public IQueryable<MediaItem> AsQueryable() {
        return context.MediaItems;
    }
    
    public void Add(MediaItem value) {
        context.MediaItems.Add(value);
    }

    public async Task<bool> Delete(Guid id, CancellationToken cancellationToken = default) {
        return await context
            .MediaItems
            .Where(m => m.Id == id)
            .ExecuteDeleteAsync(cancellationToken) == 1;
    }
}