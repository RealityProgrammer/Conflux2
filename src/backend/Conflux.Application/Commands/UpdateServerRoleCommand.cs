using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Commands;

public sealed record UpdateServerRoleCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid RoleId,
    PatchField<string> Name,
    PatchField<int> AuthorizeLevel,
    PatchField<ServerPermissions> Permissions
) : ICommand<Result<CommunityServerRoleDto>>, IServerCommand {
    public ServerPermissions RequiredPermissions => ServerPermissions.UpdateRole;
}