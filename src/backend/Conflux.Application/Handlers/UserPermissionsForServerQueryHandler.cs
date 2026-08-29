using Conflux.Application.Dto;
using Conflux.Application.Queries;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class UserPermissionsForServerQueryHandler(
    ICommunityServerMemberRepository repository
) : IQueryHandler<GetUserPermissionsForServer, Result<ServerMemberPermissionsDto>> {
    private static readonly ServerPermission[] AllPermissions = Enum.GetValues<ServerPermission>();
    
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
        
        var roles = member.MemberRoles
            .Select(mr => mr.Role)
            .OrderByDescending(r => r.AuthorizeLevel)
            .ToList();
        
        // could just do roles[0] instead of Any but just to be safe
        bool isOwner = roles.Any(r => r.SpecialRoleType == SpecialRoleType.Owner);
        
        Dictionary<ServerPermission, bool> effectivePermissions = new();

        foreach (var permission in AllPermissions) {
            if (isOwner) {
                effectivePermissions[permission] = true;
            } else {
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
        }

        MemberRoleDto[] roleDtos = [
            ..member.MemberRoles.Select(r => new MemberRoleDto(r.Role.Id, r.Role.Name))
        ];
        
        int authorizeLevel = member.MemberRoles.Max(r => r.Role.AuthorizeLevel);

        return Result<ServerMemberPermissionsDto>.Success(new(
            member.Id,
            authorizeLevel,
            effectivePermissions,
            roleDtos
        ));
    }
}