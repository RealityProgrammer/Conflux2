using Conflux.Application.Dto;

namespace Conflux.Application.Services;

public interface IServerPermissionsCacheService {
    Task<ServerMemberAuthorizeInfoDto?> GetUserAuthorizeInfo(
        Guid serverId, 
        Guid userId, 
        CancellationToken cancellationToken = default
    );
    
    Task SetUserAuthorizeInfo(
        Guid serverId,
        Guid userId,
        ServerMemberAuthorizeInfoDto value, 
        CancellationToken cancellationToken = default
    );
    
    Task DeleteUserAuthorizeInfo(
        Guid serverId, 
        Guid userId, 
        CancellationToken cancellationToken = default
    );

    Task DeleteMemberAuthorizeInfo(
        Guid memberId,
        CancellationToken cancellationToken = default
    );
    
    Task<Dictionary<Guid, ServerMemberAuthorizeInfoDto>> GetUsersAuthorizeInfo(
        Guid serverId, 
        IReadOnlyCollection<Guid> userIds, 
        CancellationToken cancellationToken = default
    );

    Task SetUsersAuthorizeInfo(
        Guid serverId,
        IReadOnlyDictionary<Guid, ServerMemberAuthorizeInfoDto> values,
        CancellationToken cancellationToken = default
    );
    
    Task<RoleAuthorizeInfo?> GetServerDefaultRoleAuthorizationInfo(
        Guid serverId, 
        CancellationToken cancellationToken = default
    );

    Task SetServerDefaultRoleAuthorizationInfo(
        Guid serverId,
        RoleAuthorizeInfo value,
        CancellationToken cancellationToken = default
    );

    Task IncrementServerPermissionVersion(Guid serverId, CancellationToken cancellationToken = default);
}