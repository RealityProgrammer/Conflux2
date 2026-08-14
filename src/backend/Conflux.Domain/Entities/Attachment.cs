namespace Conflux.Domain.Entities;

public sealed class Attachment {
    public Guid Id { get; set; }
    public string Type { get; set; } = null!;
}