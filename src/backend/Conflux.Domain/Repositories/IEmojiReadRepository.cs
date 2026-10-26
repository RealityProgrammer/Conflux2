using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IEmojiReadRepository : IReadRepository<Emoji> {
    Task<int> CountByServerId(Guid serverId, CancellationToken cancellationToken = default);
    Task<List<EmojiEntryDto>> GetEntriesByServerId(Guid serverId, CancellationToken cancellationToken = default);
}