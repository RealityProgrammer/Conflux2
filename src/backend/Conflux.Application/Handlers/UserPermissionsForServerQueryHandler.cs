using Conflux.Application.Dto;
using Conflux.Application.Queries;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.Extensions.Caching.Distributed;
using System.Collections.Frozen;

namespace Conflux.Application.Handlers;

public sealed class UserPermissionsForServerQueryHandler(
    ICommunityServerMemberRepository repository,
    IDistributedCache cache
) : IQueryHandler<GetUserPermissionsForServer, Result<ServerMemberPermissionsDto>> {
    private static readonly ServerPermission[] AllPermissions = Enum.GetValues<ServerPermission>();

    private static readonly FrozenDictionary<ServerPermission, bool> OwnerEffectivePermissions =
        AllPermissions.ToFrozenDictionary(p => p, _ => true);
    
    public async ValueTask<Result<ServerMemberPermissionsDto>> Handle(
        GetUserPermissionsForServer query, 
        CancellationToken cancellationToken
    ) {
        // TODO: caching.
        
        CommunityServerMember? member = 
            await repository.GetMemberWithRoles(query.CommunityServerId, query.UserId, false, cancellationToken);

        if (member == null) {
            return Errors.ResourceNotFound("Community server member");
        }

        if (member.MemberRoles.Any(mr => mr.Role.SpecialRoleType == SpecialRoleType.Owner)) {
            return Result<ServerMemberPermissionsDto>.Success(new(
                member.Id, 
                int.MaxValue,
                OwnerEffectivePermissions,
                [..member.MemberRoles.Select(r => new MemberRoleDto(r.Role.Id, r.Role.Name))]
            ));
        }
        
        // TODO: cache default role
        CommunityServerRole? defaultRole = 
            await repository.GetDefaultRole(query.CommunityServerId, false, cancellationToken);

        if (defaultRole == null) {
            return Errors.ResourceNotFound("Default role");
        }
        
        var roles = member.MemberRoles
            .Select(mr => mr.Role)
            .Append(defaultRole)
            .OrderByDescending(r => r.AuthorizeLevel)
            .ToList();
        
        Dictionary<ServerPermission, bool> effectivePermissions = new();

        foreach (var permission in AllPermissions) {
            bool enabled = false;
            bool shouldBreak = false;

            foreach (var role in roles) {
                foreach (var rolePermission in role.Permissions) {
                    if (rolePermission.Permission != permission) continue;
                    if (rolePermission.State == PermissionState.Inherit) continue;

                    enabled = rolePermission.State == PermissionState.Enable;
                    shouldBreak = true;
                    break;
                }

                if (shouldBreak) break;
            }

            effectivePermissions[permission] = enabled;
        }

        return Result<ServerMemberPermissionsDto>.Success(new(
            member.Id,
            roles[0].AuthorizeLevel,
            effectivePermissions,
            [..roles.Select(r => new MemberRoleDto(r.Id, r.Name))]
        ));
    }
}