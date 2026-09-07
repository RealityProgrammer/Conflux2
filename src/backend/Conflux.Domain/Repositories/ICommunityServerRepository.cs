using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerRepository : IWriteRepository<CommunityServer> {
    Task<Result<CommunityServerProfileDto>> GetProfile(
        Guid serverId,
        CancellationToken cancellationToken = default
    );
    
    Task<List<ChannelCategoryDetailDto>> GetChannelCategorySummaries(
        Guid serverId, 
        CancellationToken cancellationToken = default
    );

    Task<bool> IsCategoryExistsInServer(Guid serverId, Guid categoryId, CancellationToken cancellationToken = default);
}