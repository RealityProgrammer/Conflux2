using Conflux.Application.Dto;
using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IPresenceCacheService {
    Task<bool> IsUserConnected(Guid userId);
    
    Task<PresenceStatus?> GetManualStatus(Guid userId);
    Task SetManualStatus(Guid userId, PresenceStatus status);
    Task SetManualStatuses(IReadOnlyDictionary<Guid, PresenceStatus> statuses);
    
    Task<PresenceStatus?> GetSessionStatus(Guid userId);
    Task SetSessionStatus(Guid userId, PresenceStatus? status);

    Task<PresenceStatus?> GetEffectiveStatus(Guid userId);
    Task<IReadOnlyDictionary<Guid, PresenceStatus?>> GetEffectiveStatuses(IReadOnlyList<Guid> userIds);

    Task SetEffectiveStatus(Guid userId, PresenceStatus status);
    Task SetEffectiveStatuses(IReadOnlyDictionary<Guid, PresenceStatus> statuses);
    
    Task<IReadOnlyDictionary<Guid, RawPresenceDataDto>> GetRawPresenceData(IReadOnlyList<Guid> userIds);
}