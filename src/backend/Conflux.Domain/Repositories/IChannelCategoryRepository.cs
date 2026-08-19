using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IChannelCategoryRepository {
    void Add(ChannelCategory category);
}