namespace Conflux.Application.Services;

public interface ICurrentUserService {
    Guid? UserId { get; }
    bool IsAuthenticated { get; }
}