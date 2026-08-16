using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerRepository {
    void Add(CommunityServer communityServer);
    
    Task<bool> UpdateHasAvatar(Guid serverId, bool hasAvatar);
}