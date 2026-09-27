using Conflux.Domain;

namespace Conflux.WebApi.Services;

public interface ICallingService {
    Task<Result> TryLockCallerAndCallee(Guid callerId, string callerConnectionId, Guid calleeId);
    Task<Result> CancelCall(Guid callUser1, Guid callUser2);
    Task<Result> AcceptCall(Guid callerId, Guid calleeId, string calleeConnectionId);
    Task<Domain.Result<Guid>> DropCall(Guid userId, string userConnectionId);
}