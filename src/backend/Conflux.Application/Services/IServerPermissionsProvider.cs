using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IServerPermissionsProvider {
    Task<Result<ServerMemberPermissionsDto>> GetUserPermissions(Guid serverId, Guid userId, CancellationToken cancellationToken = default);
}