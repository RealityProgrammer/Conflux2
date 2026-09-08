using Conflux.Application.Dto;

namespace Conflux.Application.Services;

public interface IServerPermissionsCacheService {
    Task<ServerMemberAuthorizationInfoDto?> GetUserAuthorizeInfo(
        Guid serverId, 
        Guid userId, 
        CancellationToken cancellationToken = default
    );
    
    Task SetUserAuthorizeInfo(
        Guid serverId,
        Guid userId,
        ServerMemberAuthorizationInfoDto value, 
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
    
    Task<Dictionary<Guid, ServerMemberAuthorizationInfoDto>> GetUsersAuthorizeInfo(
        Guid serverId, 
        IReadOnlyCollection<Guid> userIds, 
        CancellationToken cancellationToken = default
    );

    Task SetUsersAuthorizeInfo(
        Guid serverId,
        IReadOnlyDictionary<Guid, ServerMemberAuthorizationInfoDto> values,
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