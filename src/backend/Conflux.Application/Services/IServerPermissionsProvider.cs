using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IServerPermissionsProvider {
    Task<Result<ServerMemberAuthorizationInfoDto>> GetUserAuthorizeInfo(
        Guid serverId, 
        Guid userId, 
        CancellationToken cancellationToken = default
    );

    Task<Result<ServerMemberAuthorizationInfoDto>> GetMemberAuthorizeInfo(
        Guid serverId,
        Guid memberId,
        CancellationToken cancellationToken = default
    );

    Task<Dictionary<Guid, Result<ServerMemberAuthorizationInfoDto>>> GetUsersAuthorizeInfo(
        Guid serverId,
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken = default
    );
}