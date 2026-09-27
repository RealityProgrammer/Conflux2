using Conflux.Domain;

namespace Conflux.Application.Services;

public interface ICallingService {
    Task<Result> TryLockCallerAndCallee(Guid callerId, Guid calleeId);
    Task<bool> CancelActiveCall(Guid callUser1, Guid callUser2);
}