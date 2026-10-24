using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class EmojiRepository(
    ApplicationDbContext dbContext
) : IEmojiReadRepository, IEmojiWriteRepository {
    public void Add(Emoji value) {
        dbContext.Emojis.Add(value);
    }

    public IQueryable<Emoji> AsQueryable() {
        return dbContext.Emojis;
    }
}