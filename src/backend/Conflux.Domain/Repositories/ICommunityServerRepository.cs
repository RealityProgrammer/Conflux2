using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerRepository : IWriteRepository<CommunityServer> {
    Task<List<ChannelCategoryDetailDto>> GetChannelCategoryStructure(
        Guid serverId, 
        CancellationToken cancellationToken = default
    );
}