using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using System.Collections.Frozen;

namespace Conflux.Application.Services.Implementations;

internal sealed class ServerPermissionsProvider(
    IServerMemberReadRepository memberReadRepository,
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
        
        CommunityServerMember? member = await memberReadRepository.AsQueryable()
            .AsNoTracking()
            .Where(m => m.CommunityServerId == serverId && m.UserId == userId)
            .Where(m => m.Status == MembershipStatus.Active)
            .Include(m => m.MemberRoles)
            .ThenInclude(m => m.Role)
            .ThenInclude(r => r.Permissions)
            .FirstOrDefaultAsync(cancellationToken);

        if (member == null) {
            return Errors.ResourceNotFound($"Community server member (UserId = {userId})");
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

        ServerMemberAuthorizationInfoDto dto = CreateMemberAuthorizationInfoDto(member, defaultRoleGetResult.Value!);
        await cacheService.SetUserAuthorizeInfo(serverId, userId, dto, CancellationToken.None);
        
        return Result<ServerMemberAuthorizationInfoDto>.Success(dto);
    }

    public async Task<Result<ServerMemberAuthorizationInfoDto>> GetMemberPermissions(
        Guid serverId,
        Guid memberId, 
        CancellationToken cancellationToken = default
    ) {
        // fetch server and user id from member and call GetUserPermissions, should be fast enough
        var ids = await memberReadRepository.AsQueryable().AsNoTracking()
            .Where(r => r.CommunityServerId == serverId && r.Id == memberId)
            .Select(r => new {
                r.CommunityServerId,
                r.UserId,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (ids == null) {
            return Errors.ResourceNotFound($"Community server member (Id = {memberId})");
        }

        return await GetUserPermissions(ids.CommunityServerId, ids.UserId, cancellationToken);
    }

    public async Task<Dictionary<Guid, Result<ServerMemberAuthorizationInfoDto>>> GetUsersPermissions(
        Guid serverId,
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken = default
    ) {
        Dictionary<Guid, Result<ServerMemberAuthorizationInfoDto>> results = new(userIds.Count);
        Dictionary<Guid, ServerMemberAuthorizationInfoDto> dtosToCache = new(userIds.Count);

        List<CommunityServerMember> members = await memberReadRepository.AsQueryable()
            .AsNoTracking()
            .Where(m => m.CommunityServerId == serverId && userIds.Contains(m.UserId))
            .Include(m => m.MemberRoles)
            .ThenInclude(m => m.Role)
            .ThenInclude(r => r.Permissions)
            .ToListAsync(cancellationToken);
        
        var membersByUserId = members.ToDictionary(m => m.UserId);

        Result<RoleAuthorizationInfo>? defaultRoleGetResult = null;
        
        foreach (var userId in userIds) {
            if (await cacheService.GetUserAuthorizeInfo(serverId, userId, cancellationToken) is { } cached) {
                dtosToCache[userId] = cached;
                results[userId] = Result<ServerMemberAuthorizationInfoDto>.Success(cached);

                continue;
            }
            
            if (!membersByUserId.TryGetValue(userId, out var member)) {
                results[userId] = Errors.ResourceNotFound($"Community server member (UserId = {userId})");
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

            ServerMemberAuthorizationInfoDto dto = CreateMemberAuthorizationInfoDto(member, defaultRoleGetResult.Value.Value!);

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

    private static List<RoleAuthorizationInfo> ExtractRolesAuthorizationInfo(CommunityServerMember member, RoleAuthorizationInfo defaultRole) {
        return [..member.MemberRoles
            .Select(mr => new RoleAuthorizationInfo(
                mr.Role.AuthorizeLevel,
                mr.Role.Permissions.ToDictionary(p => p.Permission, p => p.State))
            )
            .Append(defaultRole)
            .OrderByDescending(r => r.AuthorizeLevel),
        ];
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

    private static ServerMemberAuthorizationInfoDto CreateMemberAuthorizationInfoDto(CommunityServerMember member, RoleAuthorizationInfo defaultRole) {
        List<RoleAuthorizationInfo> roleAuthInfo = ExtractRolesAuthorizationInfo(member, defaultRole);

        Dictionary<ServerPermission, bool> effectivePermissions = CalculateEffectivePermissions(roleAuthInfo);

        ServerMemberAuthorizationInfoDto dto = new(
            member.Id,
            roleAuthInfo[0].AuthorizeLevel,
            effectivePermissions,
            [..member.MemberRoles
                .Where(mr => mr.Role.SpecialRoleType != SpecialRoleType.Default)
                .OrderByDescending(mr => mr.Role.AuthorizeLevel)
                .Select(mr => new MemberRoleDto(mr.Role.Id, mr.Role.Name))
            ]
        );

        return dto;
    }
}