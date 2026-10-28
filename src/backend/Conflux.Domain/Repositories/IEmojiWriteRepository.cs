using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IEmojiWriteRepository : IWriteRepository<Emoji> {
    void Remove(Emoji emoji);
    Task<bool> Delete(Guid id, CancellationToken cancellationToken);
}