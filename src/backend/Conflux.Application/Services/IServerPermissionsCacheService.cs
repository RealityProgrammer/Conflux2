using Conflux.Application.Dto;

namespace Conflux.Application.Services;

public interface IServerPermissionsCacheService {
    Task<ServerMemberPermissionsDto?> GetServerMemberPermissions(
        Guid serverId, 
        Guid userId, 
        CancellationToken cancellationToken = default
    );
    
    Task SetServerMemberPermissions(
        Guid serverId, 
        Guid userId, 
        ServerMemberPermissionsDto value, 
        CancellationToken cancellationToken = default
    );
    
    Task<RoleAuthorizationInfo?> GetServerDefaultRoleAuthorizationInfo(
        Guid serverId, 
        CancellationToken cancellationToken = default
    );

    Task SetServerDefaultRoleAuthorizationInfo(
        Guid serverId,
        RoleAuthorizationInfo value,
        CancellationToken cancellationToken = default
    );

    Task IncrementServerPermissionVersion(Guid serverId, CancellationToken cancellationToken = default);
}