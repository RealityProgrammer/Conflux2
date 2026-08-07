namespace Conflux.Domain.Enums;

public enum FriendRequestStatus {
    /// <summary>
    /// No request between two users, or unfriended status.
    /// </summary>
    None,
    
    /// <summary>
    /// Waiting for receiver to accept or sender to cancel their own request.
    /// </summary>
    Pending,
    
    /// <summary>
    /// Sender canceled their own request.
    /// </summary>
    Canceled,
    
    /// <summary>
    /// Receiver accepted the request.
    /// </summary>
    Accepted,
    
    /// <summary>
    /// Receiver rejected the request.
    /// </summary>
    Rejected,
}