using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(Message), Include = [
    nameof(Message.Id),
    nameof(Message.SenderUserId),
    nameof(Message.Body),
    nameof(Message.Attachments),
    nameof(Message.CreatedAt),
    nameof(Message.ReplyTo),
], NestedFacets = [
    typeof(TimelineMessageReplyDto),
    typeof(AttachmentDto),
], PreserveRequiredProperties = true)]
public sealed partial record TimelineMessageDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public Guid SenderUserId { get; set; } = SenderUserId;
    [Required] public string? Body { get; set; } = Body;
    [Required] public ICollection<AttachmentDto> Attachments { get; set; } = Attachments;
    [Required] public DateTimeOffset CreatedAt { get; set; } = CreatedAt;
    [Required] public TimelineMessageReplyDto? ReplyTo { get; set; } = ReplyTo;
}