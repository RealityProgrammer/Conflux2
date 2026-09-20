using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IPresenceCacheService {
    Task<bool> IsUserConnected(Guid userId);
    
    Task<PresenceStatus?> GetManualStatus(Guid userId);
    Task SetManualStatus(Guid userId, PresenceStatus status);

    Task<PresenceStatus?> GetSessionStatus(Guid userId);
    Task SetSessionStatus(Guid userId, PresenceStatus? status);
}