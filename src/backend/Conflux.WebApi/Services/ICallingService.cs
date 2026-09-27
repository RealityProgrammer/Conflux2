using Conflux.Domain;

namespace Conflux.WebApi.Services;

public interface ICallingService {
    Task<Result> TryLockCallerAndCallee(Guid callerId, string callerConnectionId, Guid calleeId);
    Task<Result> CancelCall(Guid callerId, Guid calleeId);
    Task<Result> DenyCall(Guid callerId, Guid calleeId);
    Task<Result> AcceptCall(Guid callerId, Guid calleeId, string calleeConnectionId);
    Task<Domain.Result<Guid>> DropCall(Guid userId, string userConnectionId);
}