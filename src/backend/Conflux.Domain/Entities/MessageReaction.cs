namespace Conflux.Domain.Entities;

public class MessageReaction {
    public required Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;
    
    public Dictionary<string, List<Guid>> Reactions { get; set; } = [];
}