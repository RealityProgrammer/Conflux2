namespace Conflux.Application.Services;

public interface IServerRoleVersioningService {
    Task<int> Get(Guid serverId);
    Task<int> Increment(Guid serverId);
}