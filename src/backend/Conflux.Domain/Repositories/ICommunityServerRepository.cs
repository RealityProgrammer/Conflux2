using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerRepository {
    void Add(CommunityServer communityServer);
    
    Task<bool> UpdateHasAvatar(Guid serverId, bool hasAvatar);
    
    Task<Result<CommunityServerProfileDto>> GetProfile(
        Guid serverId,
        CancellationToken cancellationToken = default
    );
    
    Task<List<ChannelCategoryIdentityDto>> GetChannelCategorySummaries(
        Guid serverId, 
        CancellationToken cancellationToken = default
    );

    Task<bool> IsCategoryExistsInServer(Guid serverId, Guid categoryId, CancellationToken cancellationToken = default);
}