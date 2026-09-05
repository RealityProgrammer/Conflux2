using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IServerPermissionsProvider {
    Task<Result<ServerMemberAuthorizationInfoDto>> GetUserPermissions(
        Guid serverId, 
        Guid userId, 
        CancellationToken cancellationToken = default
    );

    Task<Dictionary<Guid, Result<ServerMemberAuthorizationInfoDto>>> GetUsersPermissions(
        Guid serverId,
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken = default
    );
}