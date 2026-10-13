using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(Message), Include = [
    nameof(Message.Id),
    nameof(Message.Type),
    nameof(Message.ConversationId),
    nameof(Message.Sender),
    nameof(Message.Body),
    nameof(Message.Attachments),
    nameof(Message.CreatedAt),
    nameof(Message.ReplyTo),
    nameof(Message.Properties),
], NestedFacets = [
    typeof(TimelineMessageReplyDto),
    typeof(MessageAttachmentDto),
    typeof(TimelineMessageSenderDto),
], PreserveRequiredProperties = true)]
public sealed partial record TimelineMessageDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public MessageType Type { get; set; } = Type;
    [Required] public TimelineMessageSenderDto? Sender { get; set; } = Sender;
    [Required] public string? Body { get; set; } = Body;
    public ICollection<MessageAttachmentDto> Attachments { get; set; } = Attachments;
    [Required] public DateTimeOffset CreatedAt { get; set; } = CreatedAt;
    [Required] public TimelineMessageReplyDto? ReplyTo { get; set; } = ReplyTo;
    [Required] public MessageProperties? Properties { get; set; } = Properties;
    [Required] public Guid ConversationId { get; set; } = ConversationId;
    [Required, MapFrom("PinnedAt != null")] public bool IsPinned { get; set; }
}