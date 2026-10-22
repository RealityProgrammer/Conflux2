using Conflux.Application.Dto;
using Conflux.Application.Enums;

namespace Conflux.Application.Services;

public interface ISessionService {
    Task<Guid> CreateSession(Guid userId, string operatingSystemInfo, string browserInfo, SessionDevice device);
    Task<bool> RemoveSession(Guid userId, Guid sessionId);
    Task RemoveAllSessions(Guid userId);
    Task RemoveOtherSessions(Guid userId, Guid keepSessionId);
    Task RemoveAllSession(IReadOnlyList<Guid> userIds);
    Task<bool> IsSessionValid(Guid userId, Guid sessionId);
    Task ResetSessionActivityTime(Guid userId, Guid sessionId);

    Task<SessionDetails?> GetSession(Guid userId, Guid sessionId);
    Task<List<SessionDetails>> GetSessions(Guid userId);
}