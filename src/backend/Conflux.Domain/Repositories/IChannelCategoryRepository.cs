using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IChannelCategoryRepository : IWriteRepository<ChannelCategory> {
    Task<bool> Delete(Guid serverId, Guid categoryId, CancellationToken cancellationToken = default);
}