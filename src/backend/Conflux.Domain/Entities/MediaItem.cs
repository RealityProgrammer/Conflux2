using Conflux.Domain.Enums;

namespace Conflux.Domain.Entities;

public class MediaItem {
    public Guid Id { get; set; }
    public required MediaItemType Type { get; set; }
    public required string ContentType { get; set; }
    public string? FileName { get; set; }
    public short Version { get; set; }
    public required short Order { get; set; }
    
    public Guid? MessageId { get; set; }
    public Message? Message { get; set; }
}