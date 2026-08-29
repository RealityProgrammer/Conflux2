namespace Conflux.Domain.Entities;

public sealed class Attachment {
    public required Guid Id { get; set; }
    public required string Type { get; set; }
}