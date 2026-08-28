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
    public async ValueTask<Result<ServerMemberPermissionsDto>> Handle(
        GetUserPermissionsForServer query, 
        CancellationToken cancellationToken
    ) {
        // TODO: Caching.
        
        CommunityServerMember? member = 
            await repository.GetMemberWithRoles(query.CommunityServerId, query.UserId, false, cancellationToken);

        if (member == null) {
            return Errors.ResourceNotFound("Community server member");
        }

        CommunityServerRoleDto[] roleDtos = [
            ..member.MemberRoles.Select(mr => new CommunityServerRoleDto(
                mr.Role.Id,
                mr.Role.Name,
                mr.Role.Permissions,
                mr.Role.AuthorizeLevel
            ))
        ];
        
        ServerPermissions effectivePermissions = roleDtos.Aggregate(
            ServerPermissions.None,
            (current, roleDto) => current | roleDto.Permissions
        );
        int authorizeLevel = roleDtos.Max(r => r.AuthorizeLevel);

        return Result<ServerMemberPermissionsDto>.Success(new(
            member.Id,
            effectivePermissions,
            authorizeLevel,
            roleDtos
        ));
    }
}