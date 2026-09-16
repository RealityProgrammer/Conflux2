using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IServerPermissionsProvider {
    Task<Result<ServerMemberAuthorizeInfoDto>> GetUserAuthorizeInfo(
        Guid serverId, 
        Guid userId, 
        CancellationToken cancellationToken = default
    );

    Task<Result<ServerMemberAuthorizeInfoDto>> GetMemberAuthorizeInfo(
        Guid serverId,
        Guid memberId,
        CancellationToken cancellationToken = default
    );

    Task<Dictionary<Guid, Result<ServerMemberAuthorizeInfoDto>>> GetUsersAuthorizeInfo(
        Guid serverId,
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken = default
    );
}