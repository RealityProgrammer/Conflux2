using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerMemberRepository {
    void Add(CommunityServerMember value);
    Task<bool> IsUserJoined(Guid userId, Guid serverId, CancellationToken cancellationToken = default);
}