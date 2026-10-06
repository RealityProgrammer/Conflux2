using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface ICallingService {
    Task<Result<Guid>> InitializeDirectCall(Guid callerId, string callerConnectionId, Guid calleeId);

    Task<Result<AcceptCallResult>> AcceptDirectCall(Guid callId, Guid calleeId, string calleeConnectionId);

    Task<Result> LeaveOrEndCall(Guid callId, Guid userId);
    
    Task<Result<DropCallResult>> DropUserCall(Guid userId, string connectionId, bool isLastConnection);

    Task<Guid?> GetUserActiveCallId(Guid userId);

    /// <summary>
    /// Clean up all call states.
    /// </summary>
    /// <returns>Task</returns>
    /// <remarks>Only call once on application start.</remarks>
    Task CleanCallStates();
}