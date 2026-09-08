using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IServerMemberReadRepository : IReadRepository<CommunityServerMember> {
    Task<bool> IsUserJoined(Guid userId, Guid serverId, CancellationToken cancellationToken = default);
}