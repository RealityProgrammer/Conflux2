namespace Conflux.Domain.Entities;

public class Attachment {
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    
    public Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;
}