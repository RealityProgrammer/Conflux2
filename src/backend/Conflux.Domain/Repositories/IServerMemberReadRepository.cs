using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IServerMemberReadRepository : IReadRepository<CommunityServerMember> {
    Task<bool> IsUserJoined(Guid userId, Guid serverId, CancellationToken cancellationToken = default);
    
    Task<CommunityServerMember?> GetUserMemberWithRoles(
        Guid serverId,
        Guid userId,
        bool tracking = true,
        CancellationToken cancellationToken = default
    );
    
    Task<List<CommunityServerMember>> GetUserMembersWithRoles(
        Guid serverId,
        IReadOnlyCollection<Guid> userIds,
        bool tracking = true,
        CancellationToken cancellationToken = default
    );
}