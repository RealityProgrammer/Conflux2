using Conflux.Domain;

namespace Conflux.Application.Services;

public interface ICallingService {
    Task<Result> TryLockCallerAndCallee(Guid callerId, Guid calleeId);
    Task<Result> CancelCall(Guid callUser1, Guid callUser2);
    Task<Result> AcceptCall(Guid callerId, Guid calleeId);
}