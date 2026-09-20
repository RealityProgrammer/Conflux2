using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IPresenceService {
    Task<PresenceStatus> UserConnected(Guid userId);
    Task<PresenceStatus> UserDisconnected(Guid userId);

    Task SetUserManualPresenceStatus(Guid userId, PresenceStatus status);
}