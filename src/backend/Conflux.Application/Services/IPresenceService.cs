namespace Conflux.Application.Services;

public interface IPresenceService {
    Task UserConnectedAsync(Guid userId);
    Task UserDisconnectedAsync(Guid userId);
}