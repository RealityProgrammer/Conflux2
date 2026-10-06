using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface ICallingService {
    Task<Result<Guid>> InitializeDirectCall(Guid callerId, string callerConnectionId, Guid calleeId);

    Task<Result<AcceptCallResult>> AcceptDirectCall(Guid callId, Guid calleeId, string calleeConnectionId);

    Task<Result> DeleteDirectCall(Guid callId);
    
    Task<Result<CancelDirectCallResult>> CancelDirectCall(Guid callId, Guid callerId);
    
    Task<Result<RejectDirectCallResult>> RejectDirectCall(Guid callId, Guid calleeId);

    Task<Result<EndDirectCallResult>> EndDirectCall(Guid callId, Guid enderId);
    
    Task<Result<DropCallResult>> DropUserCall(Guid userId, string connectionId, bool isLastConnection);

    Task<Guid?> GetUserActiveCallId(Guid userId);

    /// <summary>
    /// Clean up all call states.
    /// </summary>
    /// <returns>Task</returns>
    /// <remarks>Only call once on application start.</remarks>
    Task CleanCallStates();
}