using Conflux.Application.Enums;
using Conflux.Domain;

namespace Conflux.WebApi.Services;

public interface ICallingService {
    Task<Result> TryLockCallerAndCallee(Guid callerId, string callerConnectionId, Guid calleeId);
    Task<Result> CancelCall(Guid callerId, Guid calleeId);
    Task<Result> DenyCall(Guid callerId, Guid calleeId);
    Task<Result> AcceptCall(Guid callerId, Guid calleeId, string calleeConnectionId);
    
    /// <summary>
    /// Mark the call as dropped.
    /// </summary>
    /// <param name="userId">ID of user who trigger the call dropping procedure.</param>
    /// <param name="userConnectionId">Connection ID of user who trigger the call dropping procedure.</param>
    /// <returns>
    /// Result containing the ID of the call peer user.
    /// </returns>
    Task<Domain.Result<Guid>> DropCall(Guid userId, string userConnectionId);
    
    /// <summary>
    /// Get the ongoing call with <see cref="CallState.Ringing"/> of user.
    /// </summary>
    /// <param name="userId">ID of user to get ringing call from.</param>
    /// <returns>
    /// Result containing the ID of the call peer user (in this case, the caller).
    /// </returns>
    Task<Domain.Result<Guid>> GetCurrentRingingCall(Guid userId);
}