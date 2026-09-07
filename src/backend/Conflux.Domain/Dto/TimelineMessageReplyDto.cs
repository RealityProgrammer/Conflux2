using Conflux.Domain.Entities;
using Conflux.Domain.Mappers;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(Message), Include = [], Configuration = typeof(MessageMapConfiguration))]
public sealed partial class TimelineMessageReplyDto {
    public Guid MessageId { get; set; }
    public Guid SenderUserId { get; set; }
    public string? BodySnippet { get; set; }
    public bool HasMoreBody { get; set; }
    public int AttachmentCount { get; set; }
}