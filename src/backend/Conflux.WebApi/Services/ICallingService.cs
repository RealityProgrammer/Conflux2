using Conflux.Application.Enums;
using Conflux.Domain;

namespace Conflux.WebApi.Services;

public interface ICallingService {
    Task<Result> TryLockCallerAndCallee(Guid callerId, string callerConnectionId, Guid calleeId);
    /// <summary>
    /// Mark the call as canceled by caller while call is ringing.
    /// </summary>
    /// <param name="callerId">ID of caller user.</param>
    /// <param name="calleeId">ID of callee user.</param>
    /// <returns>
    /// The result of call cancellation operation.
    /// </returns>
    Task<Result> CancelCall(Guid callerId, Guid calleeId);
    
    /// <summary>
    /// Mark the call as denied by callee while call is ringing.
    /// </summary>
    /// <param name="callerId">ID of caller user.</param>
    /// <param name="calleeId">ID of callee user.</param>
    /// <returns>
    /// The result of call denying operation.
    /// </returns>
    Task<Result> DenyCall(Guid callerId, Guid calleeId);
    
    /// <summary>
    /// Mark the call as accepted by callee while call is ringing.
    /// </summary>
    /// <param name="callerId">ID of caller user.</param>
    /// <param name="calleeId">ID of callee user.</param>
    /// <param name="calleeConnectionId">Connection ID of callee.</param>
    /// <returns>
    /// The result of call accepting operation.
    /// </returns>
    Task<Result> AcceptCall(Guid callerId, Guid calleeId, string calleeConnectionId);
    
    /// <summary>
    /// Mark the call as dropped.
    /// </summary>
    /// <param name="userId">ID of user who trigger the call dropping procedure.</param>
    /// <param name="userConnectionId">Connection ID of user who trigger the call dropping.</param>
    /// <returns>
    /// The result of call dropping operation, containing the ID of the call peer user.
    /// </returns>
    Task<Domain.Result<Guid>> DropCall(Guid userId, string userConnectionId);

    /// <summary>
    /// Mark the call as ended.
    /// </summary>
    /// <param name="enderId">ID of user who trigger the call ending.</param>
    /// <param name="peerId">ID of call peer user.</param>
    /// <returns>
    /// The result of call ending operation, containing the ID of the call peer user.
    /// </returns>
    Task<Domain.Result<Guid>> EndCall(Guid enderId, Guid peerId);
    
    /// <summary>
    /// Get the ongoing call with <see cref="CallState.Ringing"/> of user.
    /// </summary>
    /// <param name="userId">ID of user to get ringing call from.</param>
    /// <returns>
    /// Result containing the ID of the call peer user (in this case, the caller).
    /// </returns>
    Task<Domain.Result<Guid>> GetCurrentRingingCall(Guid userId);
}