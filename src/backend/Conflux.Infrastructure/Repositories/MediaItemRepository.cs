using Conflux.Domain;
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
        return await context.MediaItems
            .Where(m => m.Id == id)
            .ExecuteDeleteAsync(cancellationToken) == 1;
    }

    public async Task<int?> Update(Guid id, string contentType, CancellationToken cancellationToken = default) {
        var results = await context.Database.SqlQuery<int?>(
            $"""
             UPDATE "MediaItems" 
             SET 
                 "ContentType" = {contentType},
                 "Version" = "Version" + 1
             WHERE "Id" = {id}
             RETURNING "Version" AS Version;
             """
        ).ToListAsync(cancellationToken);
        
        return results.SingleOrDefault();
    }
}