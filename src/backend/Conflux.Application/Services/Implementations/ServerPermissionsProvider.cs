using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using System.Collections.Frozen;

namespace Conflux.Application.Services.Implementations;

internal sealed class ServerPermissionsProvider(
    IServerMemberReadRepository memberReadRepository,
    IServerPermissionsCacheService cacheService,
    IServerDefaultRoleAuthorizeProvider defaultRoleAuthorizeProvider,
    TimeProvider timeProvider
) : IServerPermissionsProvider {
    private static readonly ServerPermission[] AllPermissions = Enum.GetValues<ServerPermission>();

    private static readonly FrozenSet<ServerPermission> OwnerEffectivePermissions = [..AllPermissions];
    
    public async Task<Result<ServerMemberAuthorizeInfoDto>> GetUserAuthorizeInfo(
        Guid serverId, 
        Guid userId, 
        CancellationToken cancellationToken = default
    ) {
        if (await cacheService.GetUserAuthorizeInfo(serverId, userId, cancellationToken) is { } cached) {
            return Result<ServerMemberAuthorizeInfoDto>.Success(cached);
        }

        CommunityServerMember? member = await memberReadRepository.AsQueryable()
            .AsNoTracking()
            .Where(m => m.CommunityServerId == serverId && m.UserId == userId && m.Status == MembershipStatus.Active)
            .Include(m => m.MemberRoles)
            .ThenInclude(m => m.Role)
            .ThenInclude(r => r.Permissions)
            .FirstOrDefaultAsync(cancellationToken);

        if (member == null) {
            return Errors.ResourceNotFound("Community server member", [
                new(nameof(CommunityServerMember.CommunityServerId), serverId.ToString()),
                new(nameof(CommunityServerMember.UserId), userId.ToString()),
            ]);
        }

        if (member.MemberRoles.Any(mr => mr.Role.SpecialRoleType == SpecialRoleType.Owner)) {
            ServerMemberAuthorizeInfoDto ownerDto = new(
                member.Id,
                int.MaxValue,
                OwnerEffectivePermissions,
                [.. member.MemberRoles.Select(r => new MemberRoleDto(r.Role.Id, r.Role.Name))],
                false
            );
            
            await cacheService.SetUserAuthorizeInfo(serverId, userId, ownerDto, cancellationToken);
            
            return Result<ServerMemberAuthorizeInfoDto>.Success(ownerDto);
        }

        RoleAuthorizeInfo? defaultRoleAuthorizeInfo =
            await defaultRoleAuthorizeProvider.Get(serverId, cancellationToken);
        
        if (defaultRoleAuthorizeInfo == null) {
            return Errors.ResourceNotFound("Default server role", [
                new(nameof(CommunityServerRole.CommunityServerId), serverId.ToString()),
            ]);
        }

        ServerMemberAuthorizeInfoDto dto = CreateMemberAuthorizationInfoDto(member, defaultRoleAuthorizeInfo, timeProvider.GetUtcNow());
        await cacheService.SetUserAuthorizeInfo(serverId, userId, dto, CancellationToken.None);
        
        return Result<ServerMemberAuthorizeInfoDto>.Success(dto);
    }

    public async Task<Result<ServerMemberAuthorizeInfoDto>> GetMemberAuthorizeInfo(
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
            return Errors.ResourceNotFound("Community server member", [
                new(nameof(CommunityServerMember.CommunityServerId), serverId.ToString()),
                new(nameof(CommunityServerMember.Id), memberId.ToString()),
            ]);
        }

        return await GetUserAuthorizeInfo(ids.CommunityServerId, ids.UserId, cancellationToken);
    }

    public async Task<Dictionary<Guid, Result<ServerMemberAuthorizeInfoDto>>> GetUsersAuthorizeInfo(
        Guid serverId,
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken = default
    ) {
        Dictionary<Guid, Result<ServerMemberAuthorizeInfoDto>> results = new(userIds.Count);
        Dictionary<Guid, ServerMemberAuthorizeInfoDto> dtosToCache = new(userIds.Count);

        List<CommunityServerMember> members = await memberReadRepository.AsQueryable()
            .AsNoTracking()
            .Where(m => m.CommunityServerId == serverId && userIds.Contains(m.UserId))
            .Include(m => m.MemberRoles)
            .ThenInclude(m => m.Role)
            .ThenInclude(r => r.Permissions)
            .ToListAsync(cancellationToken);
        
        var membersByUserId = members.ToDictionary(m => m.UserId);

        foreach (var userId in userIds) {
            if (await cacheService.GetUserAuthorizeInfo(serverId, userId, cancellationToken) is { } cached) {
                dtosToCache[userId] = cached;
                results[userId] = Result<ServerMemberAuthorizeInfoDto>.Success(cached);

                continue;
            }
            
            if (!membersByUserId.TryGetValue(userId, out var member)) {
                results[userId] = Errors.ResourceNotFound($"Community server member (CommunityServerId = {serverId}, UserId = {userId})");
                continue;
            }

            // Handle Owner
            if (member.MemberRoles.Any(mr => mr.Role.SpecialRoleType == SpecialRoleType.Owner)) {
                ServerMemberAuthorizeInfoDto ownerDto = new(
                    member.Id,
                    int.MaxValue,
                    OwnerEffectivePermissions,
                    [.. member.MemberRoles.Select(r => new MemberRoleDto(r.Role.Id, r.Role.Name))],
                    false
                );

                dtosToCache[userId] = ownerDto;
                results[userId] = Result<ServerMemberAuthorizeInfoDto>.Success(ownerDto);
                continue;
            }
            
            RoleAuthorizeInfo? defaultRoleAuthorizeInfo =
                await defaultRoleAuthorizeProvider.Get(serverId, cancellationToken);

            if (defaultRoleAuthorizeInfo == null) {
                results[userId] = Errors.ResourceNotFound("Default server role", [
                    new(nameof(CommunityServerRole.CommunityServerId), serverId.ToString()),
                ]);
                continue;
            }

            ServerMemberAuthorizeInfoDto dto = CreateMemberAuthorizationInfoDto(member, defaultRoleAuthorizeInfo, timeProvider.GetUtcNow());

            dtosToCache[userId] = dto;
            results[userId] = Result<ServerMemberAuthorizeInfoDto>.Success(dto);
        }

        if (dtosToCache.Count > 0) {
            await cacheService.SetUsersAuthorizeInfo(serverId, dtosToCache, CancellationToken.None);
        }

        return results;
    }

    private static List<RoleAuthorizeInfo> ExtractRolesAuthorizationInfo(CommunityServerMember member, RoleAuthorizeInfo defaultRole) {
        return [..member.MemberRoles
            .Select(mr => new RoleAuthorizeInfo(
                mr.Role.AuthorizeLevel,
                mr.Role.Permissions.ToDictionary(p => p.Permission, p => p.State))
            )
            .Append(defaultRole)
            .OrderByDescending(r => r.AuthorizeLevel),
        ];
    }

    private static ServerMemberAuthorizeInfoDto CreateMemberAuthorizationInfoDto(
        CommunityServerMember member, 
        RoleAuthorizeInfo defaultRole,
        DateTimeOffset currentTime
    ) {
        List<RoleAuthorizeInfo> roleAuthInfo = ExtractRolesAuthorizationInfo(member, defaultRole);

        HashSet<ServerPermission> effectivePermissions =
            member.BanExpireAt == null || currentTime >= member.BanExpireAt ?
                CalculateEffectivePermissions(roleAuthInfo) :
                [];

        ServerMemberAuthorizeInfoDto dto = new(
            member.Id,
            roleAuthInfo[0].AuthorizeLevel,
            effectivePermissions,
            [..member.MemberRoles
                .OrderByDescending(mr => mr.Role.AuthorizeLevel)
                .Select(mr => new MemberRoleDto(mr.Role.Id, mr.Role.Name))
            ],
            member.BanExpireAt != null && member.BanExpireAt <= currentTime
        );

        return dto;
    }
    
    private static HashSet<ServerPermission> CalculateEffectivePermissions(
        List<RoleAuthorizeInfo> rolesAuthorizationInfo
    ) {
        HashSet<ServerPermission> effectivePermissions = [];

        foreach (var permission in AllPermissions) {
            bool enabled = false;

            foreach (var authInfo in rolesAuthorizationInfo) {
                if (!authInfo.Permissions.TryGetValue(permission, out var state) || state == PermissionState.Inherit) {
                    continue;
                }
                
                enabled = state == PermissionState.Enable;
                break;
            }

            if (enabled) {
                effectivePermissions.Add(permission);
            }
        }

        return effectivePermissions;
    }
}