namespace Conflux.Domain.Entities;

public class MessageReaction {
    public required Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;
    
    public Dictionary<string, HashSet<Guid>> Reactions { get; set; } = [];
}