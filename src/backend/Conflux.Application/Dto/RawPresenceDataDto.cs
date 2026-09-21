using Conflux.Domain.Enums;

namespace Conflux.Application.Dto;

public sealed record RawPresenceDataDto(
    bool IsConnected, 
    PresenceStatus? ManualStatus, 
    PresenceStatus? SessionStatus
);