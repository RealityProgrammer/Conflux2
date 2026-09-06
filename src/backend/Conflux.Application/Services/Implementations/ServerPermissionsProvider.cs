using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using System.Collections.Frozen;

namespace Conflux.Application.Services.Implementations;

internal sealed class ServerPermissionsProvider(
    ICommunityServerMemberRepository memberRepository,
    ICommunityServerRoleRepository roleRepository,
    IServerPermissionsCacheService cacheService
) : IServerPermissionsProvider {
    private static readonly ServerPermission[] AllPermissions = Enum.GetValues<ServerPermission>();

    private static readonly FrozenDictionary<ServerPermission, bool> OwnerEffectivePermissions =
        AllPermissions.ToFrozenDictionary(p => p, _ => true);
    
    public async Task<Result<ServerMemberAuthorizationInfoDto>> GetUserPermissions(
        Guid serverId, 
        Guid userId, 
        CancellationToken cancellationToken = default
    ) {
        if (await cacheService.GetUserAuthorizeInfo(serverId, userId, cancellationToken) is { } cached) {
            return Result<ServerMemberAuthorizationInfoDto>.Success(cached);
        }

        CommunityServerMember? member = 
            await memberRepository.GetUserMemberWithRoles(serverId, userId, false, cancellationToken);

        if (member == null) {
            return Errors.ResourceNotFound("Community server member");
        }

        if (member.MemberRoles.Any(mr => mr.Role.SpecialRoleType == SpecialRoleType.Owner)) {
            ServerMemberAuthorizationInfoDto ownerDto = new(
                member.Id,
                int.MaxValue,
                OwnerEffectivePermissions,
                [.. member.MemberRoles.Select(r => new MemberRoleDto(r.Role.Id, r.Role.Name))]
            );
            
            await cacheService.SetUserAuthorizeInfo(serverId, userId, ownerDto, cancellationToken);
            
            return Result<ServerMemberAuthorizationInfoDto>.Success(ownerDto);
        }

        Result<RoleAuthorizationInfo> defaultRoleGetResult = await GetDefaultRoleInfo(serverId, cancellationToken);
        if (!defaultRoleGetResult.IsSuccess) {
            return defaultRoleGetResult.Error;
        }

        RoleAuthorizationInfo defaultRoleAuthorizationInfo = defaultRoleGetResult.Value!;
        
        List<RoleAuthorizationInfo> roleAuthInfo = member.MemberRoles
            .Select(mr => new RoleAuthorizationInfo(
                mr.Role.AuthorizeLevel, 
                mr.Role.Permissions.ToDictionary(p => p.Permission, p => p.State))
            )
            .Append(defaultRoleAuthorizationInfo)
            .OrderByDescending(r => r.AuthorizeLevel)
            .ToList();

        Dictionary<ServerPermission, bool> effectivePermissions = CalculateEffectivePermissions(roleAuthInfo);

        ServerMemberAuthorizationInfoDto dto = new(
            member.Id,
            roleAuthInfo[0].AuthorizeLevel,
            effectivePermissions,
            [..member.MemberRoles.Select(mr => new MemberRoleDto(mr.Role.Id, mr.Role.Name))]
        );
        
        await cacheService.SetUserAuthorizeInfo(serverId, userId, dto, CancellationToken.None);

        return Result<ServerMemberAuthorizationInfoDto>.Success(dto);
    }

    public async Task<Dictionary<Guid, Result<ServerMemberAuthorizationInfoDto>>> GetUsersPermissions(
        Guid serverId,
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken = default
    ) {
        Dictionary<Guid, Result<ServerMemberAuthorizationInfoDto>> results = new(userIds.Count);
        Dictionary<Guid, ServerMemberAuthorizationInfoDto> dtosToCache = new(userIds.Count);

        var members = await memberRepository.GetUserMembersWithRoles(serverId, userIds, false, cancellationToken);
        var membersByUserId = members.ToDictionary(m => m.UserId);

        Result<RoleAuthorizationInfo>? defaultRoleGetResult = null;

        foreach (var userId in userIds) {
            if (!membersByUserId.TryGetValue(userId, out var member)) {
                results[userId] = Errors.ResourceNotFound($"Community server member (UserId: {userId})");
                continue;
            }

            // Handle Owner
            if (member.MemberRoles.Any(mr => mr.Role.SpecialRoleType == SpecialRoleType.Owner)) {
                ServerMemberAuthorizationInfoDto ownerDto = new(
                    member.Id,
                    int.MaxValue,
                    OwnerEffectivePermissions,
                    [.. member.MemberRoles.Select(r => new MemberRoleDto(r.Role.Id, r.Role.Name))]
                );

                dtosToCache[userId] = ownerDto;
                results[userId] = Result<ServerMemberAuthorizationInfoDto>.Success(ownerDto);
                continue;
            }

            defaultRoleGetResult ??= await GetDefaultRoleInfo(serverId, cancellationToken);

            if (!defaultRoleGetResult.Value.IsSuccess) {
                results[userId] = defaultRoleGetResult.Value.Error;
                continue;
            }

            RoleAuthorizationInfo defaultRoleAuthorizationInfo = defaultRoleGetResult.Value.Value!;

            var roleAuthInfo = member.MemberRoles
                .Select(mr => new RoleAuthorizationInfo(
                    mr.Role.AuthorizeLevel,
                    mr.Role.Permissions.ToDictionary(p => p.Permission, p => p.State))
                )
                .Append(defaultRoleAuthorizationInfo)
                .OrderByDescending(r => r.AuthorizeLevel)
                .ToList();

            Dictionary<ServerPermission, bool> effectivePermissions = CalculateEffectivePermissions(roleAuthInfo);

            ServerMemberAuthorizationInfoDto dto = new(
                member.Id,
                roleAuthInfo[0].AuthorizeLevel,
                effectivePermissions,
                [.. member.MemberRoles.Select(mr => new MemberRoleDto(mr.Role.Id, mr.Role.Name))]
            );

            dtosToCache[userId] = dto;
            results[userId] = Result<ServerMemberAuthorizationInfoDto>.Success(dto);
        }

        if (dtosToCache.Count > 0) {
            await cacheService.SetUsersAuthorizeInfo(serverId, dtosToCache, CancellationToken.None);
        }

        return results;
    }

    private async Task<Result<RoleAuthorizationInfo>> GetDefaultRoleInfo(
        Guid serverId, 
        CancellationToken cancellationToken
    ) {
        RoleAuthorizationInfo? defaultRoleAuthorizationInfo =
            await cacheService.GetServerDefaultRoleAuthorizationInfo(serverId, cancellationToken);

        if (defaultRoleAuthorizationInfo == null) {
            CommunityServerRole? defaultRole = 
                await roleRepository.GetDefaultRole(serverId, false, cancellationToken);

            if (defaultRole == null) {
                return Errors.ResourceNotFound("Default role");
            }

            defaultRoleAuthorizationInfo = new(
                defaultRole.AuthorizeLevel, 
                defaultRole.Permissions.ToDictionary(p => p.Permission, p => p.State)
            );

            await cacheService.SetServerDefaultRoleAuthorizationInfo(serverId, defaultRoleAuthorizationInfo, CancellationToken.None);
        }
        
        return Result<RoleAuthorizationInfo>.Success(defaultRoleAuthorizationInfo);
    }

    private static Dictionary<ServerPermission, bool> CalculateEffectivePermissions(
        List<RoleAuthorizationInfo> rolesAuthorizationInfo
    ) {
        Dictionary<ServerPermission, bool> effectivePermissions = [];

        foreach (var permission in AllPermissions) {
            bool enabled = false;

            foreach (var authInfo in rolesAuthorizationInfo) {
                if (!authInfo.Permissions.TryGetValue(permission, out var state) || state == PermissionState.Inherit) {
                    continue;
                }
                
                enabled = state == PermissionState.Enable;
                break;
            }

            effectivePermissions[permission] = enabled;
        }

        return effectivePermissions;
    }
}