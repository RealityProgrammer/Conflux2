using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(Message), Include = [
    nameof(Message.Id),
    nameof(Message.Body),
    nameof(Message.Attachments),
    nameof(Message.SenderUserId),
    nameof(Message.Sender),
    nameof(Message.CreatedAt),
    nameof(Message.UpdatedAt),
    nameof(Message.PinnedAt),
], NestedFacets = [
    typeof(TimelineMessageSenderDto),
    typeof(AttachmentDto),
])]
public sealed partial record PinnedMessageDto {
    [Required] public Guid Id { get; set; } = Id;
    public string? Body { get; set; } = Body;
    [Required] public ICollection<AttachmentDto> Attachments { get; set; } = Attachments;
    [Required] public Guid? SenderUserId { get; set; } = SenderUserId;
    public TimelineMessageSenderDto? Sender { get; set; } = Sender;
    [Required] public DateTimeOffset CreatedAt { get; set; } = CreatedAt;
    public DateTimeOffset? UpdatedAt { get; set; } = UpdatedAt;
    public DateTimeOffset? PinnedAt { get; set; } = PinnedAt;
}