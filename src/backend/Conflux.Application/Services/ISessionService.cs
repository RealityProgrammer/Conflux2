namespace Conflux.Application.Services;

public interface ISessionService {
    Task<Guid> CreateSession(Guid userId, string deviceInfo);
    Task RemoveSession(Guid userId, Guid sessionId);
    Task RemoveAllSession(Guid userId);
    Task RemoveAllSession(IReadOnlyList<Guid> userIds);
    Task<bool> IsSessionValid(Guid userId, Guid sessionId);
    Task ResetSessionActivityTime(Guid userId, Guid sessionId);
}