namespace Conflux.Domain.Enums;

public enum AccountDeletionStatus {
    /// <summary>
    /// Account has no pending deletion request.
    /// </summary>
    None,
    
    /// <summary>
    /// Account has pending deletion request and is on 14 days grace-period.
    /// </summary>
    Pending,
    
    /// <summary>
    /// Account has pending deletion request, 14 days grace-period is expired and waiting to be wiped by system.
    /// </summary>
    Expired,
    
    /// <summary>
    /// Account got wiped.
    /// </summary>
    Deleted,
}