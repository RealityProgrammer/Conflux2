using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IPresenceService {
    Task<PresenceStatus> UserConnected(Guid userId);
    Task<PresenceStatus> UserDisconnected(Guid userId);

    Task SetManualPresenceStatus(Guid userId, PresenceStatus status);

    Task<PresenceStatus> GetEffectivePresenceStatus(Guid userId);
    Task<IReadOnlyDictionary<Guid, PresenceStatus>> GetEffectivePresenceStatuses(IReadOnlyList<Guid> userIds);
    
    Task SetAutoIdle(Guid userId, bool isIdle);
}