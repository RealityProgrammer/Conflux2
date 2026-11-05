using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IChannelRepository : IWriteRepository<Channel>, IReadRepository<Channel> {
    Task<bool> Delete(Guid serverId, Guid channelId, CancellationToken cancellationToken = default);
}