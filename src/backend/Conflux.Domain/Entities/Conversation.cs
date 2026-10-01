namespace Conflux.Domain.Entities;

public class Conversation {
    public Guid Id { get; set; }
    
    public DateTimeOffset? LatestMessageAt { get; set; }

    public virtual ICollection<Message> Messages { get; set; } = [];

    public Channel Channel { get; set; } = null!;

    public virtual ICollection<ConversationParticipant> Participants { get; set; } = [];
}