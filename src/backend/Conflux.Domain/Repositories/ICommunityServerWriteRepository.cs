using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerWriteRepository : IWriteRepository<CommunityServer> {
    Task<List<ChannelCategoryDetailDto>> GetChannelCategoryStructure(
        Guid serverId, 
        CancellationToken cancellationToken = default
    );
}