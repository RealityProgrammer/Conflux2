using Conflux.Domain.Enums;

namespace Conflux.Domain.Entities;

public class Conversation {
    public Guid Id { get; set; }
    public ConversationType Type { get; set; }
    
    public DateTimeOffset? LatestMessageAt { get; set; }

    public virtual ICollection<Message> Messages { get; set; } = [];

    public Channel? Channel { get; set; }

    public virtual ICollection<ConversationParticipant> Participants { get; set; } = [];
    
    public Guid? FriendRequestId { get; set; }
    public FriendRequest? FriendRequest { get; set; }
}