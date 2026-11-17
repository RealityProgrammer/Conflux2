using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IEmojiRepository : IRepository<Emoji> {
    Task<int> CountByServerId(Guid serverId, CancellationToken cancellationToken = default);
    Task<List<EmojiEntryDto>> GetEntriesByServerId(Guid serverId, CancellationToken cancellationToken = default);
    
    void Remove(Emoji emoji);
    Task<bool> Delete(Guid id, CancellationToken cancellationToken);
}