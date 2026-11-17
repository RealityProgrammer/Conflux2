using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IServerMemberRepository : IRepository<CommunityServerMember> {
    Task<bool> IsUserJoined(Guid userId, Guid serverId, CancellationToken cancellationToken = default);
}