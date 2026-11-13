using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IChannelCategoryRepository : IRepository<ChannelCategory> {
    Task<bool> Delete(Guid serverId, Guid categoryId, CancellationToken cancellationToken = default);
}