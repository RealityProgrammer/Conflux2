using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IEmojiReadRepository : IReadRepository<Emoji> {
    Task<int> CountByServerId(Guid serverId, CancellationToken cancellationToken = default);
}