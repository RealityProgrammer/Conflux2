namespace Conflux.Domain;

public class Conversation {
    public Guid Id { get; set; }

    public virtual ICollection<Message> Messages { get; set; } = null!;
}