namespace Conflux.Domain;

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

public class FriendRequest : IHasCreatedAt {
    public Guid Id { get; set; }
    public Guid SenderUserId { get; set; }
    public Guid ReceiverUserId { get; set; }
    
    public FriendRequestStatus Status { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    
    public ApplicationUser Sender { get; set; } = null!;
    public ApplicationUser Receiver { get; set; } = null!;
}