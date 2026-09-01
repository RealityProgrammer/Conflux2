using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using System.Collections.Frozen;

namespace Conflux.Application.Services.Implementations;

internal sealed class ServerPermissionsProvider(
    ICommunityServerMemberRepository repository,
    IServerPermissionsCacheService serverPermissionsCacheService
) : IServerPermissionsProvider {
    private static readonly ServerPermission[] AllPermissions = Enum.GetValues<ServerPermission>();

    private static readonly FrozenDictionary<ServerPermission, bool> OwnerEffectivePermissions =
        AllPermissions.ToFrozenDictionary(p => p, _ => true);
    
    public async Task<Result<ServerMemberPermissionsDto>> GetUserPermissions(Guid serverId, Guid userId, CancellationToken cancellationToken = default) {
        if (await serverPermissionsCacheService.GetServerMemberPermissions(serverId, userId, cancellationToken) is { } cached) {
            return Result<ServerMemberPermissionsDto>.Success(cached);
        }

        CommunityServerMember? member = 
            await repository.GetMemberWithRoles(serverId, userId, false, cancellationToken);

        if (member == null) {
            return Errors.ResourceNotFound("Community server member");
        }

        if (member.MemberRoles.Any(mr => mr.Role.SpecialRoleType == SpecialRoleType.Owner)) {
            ServerMemberPermissionsDto ownerDto = new(
                member.Id,
                int.MaxValue,
                OwnerEffectivePermissions,
                [.. member.MemberRoles.Select(r => new MemberRoleDto(r.Role.Id, r.Role.Name))]
            );
            
            await serverPermissionsCacheService.SetServerMemberPermissions(serverId, userId, ownerDto, cancellationToken);
            
            return Result<ServerMemberPermissionsDto>.Success(ownerDto);
        }

        RoleAuthorizationInfo? defaultRoleAuthorizationInfo =
            await serverPermissionsCacheService.GetServerDefaultRoleAuthorizationInfo(serverId, cancellationToken);

        if (defaultRoleAuthorizationInfo == null) {
            CommunityServerRole? defaultRole = 
                await repository.GetDefaultRole(serverId, false, cancellationToken);

            if (defaultRole == null) {
                return Errors.ResourceNotFound("Default role");
            }

            defaultRoleAuthorizationInfo = new(
                defaultRole.AuthorizeLevel, 
                defaultRole.Permissions.ToDictionary(p => p.Permission, p => p.State)
            );

            await serverPermissionsCacheService.SetServerDefaultRoleAuthorizationInfo(serverId, defaultRoleAuthorizationInfo, CancellationToken.None);
        }
        
        var roleAuthInfo = member.MemberRoles
            .Select(mr => new RoleAuthorizationInfo(
                mr.Role.AuthorizeLevel, 
                mr.Role.Permissions.ToDictionary(p => p.Permission, p => p.State))
            )
            .Append(defaultRoleAuthorizationInfo)
            .OrderByDescending(r => r.AuthorizeLevel)
            .ToList();
        
        Dictionary<ServerPermission, bool> effectivePermissions = new();

        foreach (var permission in AllPermissions) {
            bool enabled = false;

            foreach (var authInfo in roleAuthInfo) {
                if (!authInfo.Permissions.TryGetValue(permission, out var state) || state == PermissionState.Inherit) {
                    continue;
                }
                
                enabled = state == PermissionState.Enable;
                break;
            }

            effectivePermissions[permission] = enabled;
        }

        ServerMemberPermissionsDto dto = new(
            member.Id,
            roleAuthInfo[0].AuthorizeLevel,
            effectivePermissions,
            [..member.MemberRoles.Select(mr => new MemberRoleDto(mr.Role.Id, mr.Role.Name))]
        );
        
        await serverPermissionsCacheService.SetServerMemberPermissions(serverId, userId, dto, CancellationToken.None);

        return Result<ServerMemberPermissionsDto>.Success(dto);
    }
}