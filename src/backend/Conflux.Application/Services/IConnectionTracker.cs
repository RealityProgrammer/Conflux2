namespace Conflux.Application.Services;

public interface IConnectionTracker {
    Task<int> AddConnection(Guid userId, string connectionId);
    Task<int> RemoveConnection(Guid userId, string connectionId);
    Task<int> GetConnectionsCount(Guid userId);
    Task RemoveAllConnections(Guid userId);
    Task<List<string>> GetConnections(Guid userId);
    
    Task PruneAllConnections();
}