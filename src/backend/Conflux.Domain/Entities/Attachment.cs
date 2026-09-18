namespace Conflux.Domain.Entities;

public sealed class Attachment {
    public required string Name { get; set; }
    public required Guid Id { get; set; }
    public required string Type { get; set; }
}