using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerRepository : IRepository<CommunityServer> {
    Task<bool> Exists(Guid id, CancellationToken cancellationToken = default);
    
    Task<List<ChannelCategoryDetailDto>> GetChannelCategoryStructure(
        Guid serverId, 
        CancellationToken cancellationToken = default
    );
}