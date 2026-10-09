using Conflux.Application.Dto;

namespace Conflux.Application.Services;

public interface IServerDefaultRoleAuthorizeProvider {
    Task<RoleAuthorizeInfo?> Get(Guid serverId, CancellationToken cancellationToken = default);
    Task Remove(Guid serverId);
}