namespace Conflux.Application.Services;

public interface ICurrentUserService {
    Guid? UserId { get; }
    Guid? SessionId { get; }
    bool IsAuthenticated { get; }
}