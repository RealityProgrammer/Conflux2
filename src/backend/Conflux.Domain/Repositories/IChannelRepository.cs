using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IChannelRepository : IRepository<Channel> {
    Task<bool> Delete(Guid serverId, Guid channelId, CancellationToken cancellationToken = default);
}