using Conflux.Domain.Config;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Domain;

public enum FriendRequestStatus {
    /// <summary>
    /// Representing no request between two users, or unfriended status. 
    /// </summary>
    None,
    
    /// <summary>
    /// Representing pending status.
    /// </summary>
    Pending,
    
    /// <summary>
    /// Representing accepted status.
    /// </summary>
    Accepted,
    
    /// <summary>
    /// Representing rejected status.
    /// </summary>
    Rejected,
}

[EntityTypeConfiguration(typeof(FriendRequestConfiguration))]
public class FriendRequest {
    public Guid Id { get; set; }
    public Guid SenderUserId { get; set; }
    public Guid ReceiverUserId { get; set; }
    
    public FriendRequestStatus Status { get; set; }
    
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
}