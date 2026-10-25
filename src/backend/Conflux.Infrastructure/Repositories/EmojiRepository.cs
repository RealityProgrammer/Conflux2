using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class EmojiRepository(
    ApplicationDbContext dbContext
) : IEmojiReadRepository, IEmojiWriteRepository {
    public async Task<int> CountByServerId(Guid serverId, CancellationToken cancellationToken = default) {
        return await dbContext.Emojis.CountAsync(x => x.Id == serverId, cancellationToken);
    }

    public void Add(Emoji value) {
        dbContext.Emojis.Add(value);
    }

    public void Remove(Emoji emoji) {
        dbContext.Emojis.Remove(emoji);
    }

    public async Task<bool> Delete(Guid id, CancellationToken cancellationToken) {
        return await dbContext.Emojis.Where(x => x.Id == id).ExecuteDeleteAsync(cancellationToken) > 0;
    }

    public IQueryable<Emoji> AsQueryable() {
        return dbContext.Emojis;
    }
}