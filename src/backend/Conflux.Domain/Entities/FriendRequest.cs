using Conflux.Domain.Enums;

namespace Conflux.Domain.Entities;

public class FriendRequest : IHasCreatedAt {
    public Guid Id { get; set; }
    
    public Guid SenderUserId { get; set; }
    public ApplicationUser Sender { get; set; } = null!;
    
    public Guid ReceiverUserId { get; set; }
    public ApplicationUser Receiver { get; set; } = null!;
    
    public FriendRequestStatus Status { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    
    public Channel? ConversationChannel { get; set; }
}