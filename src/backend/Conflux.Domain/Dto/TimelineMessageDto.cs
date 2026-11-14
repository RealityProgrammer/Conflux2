using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

public sealed record TimelineMessageDto(
    Guid Id,
    MessageType Type,
    TimelineMessageSenderDto? Sender,
    string? Body,
    IList<MessageAttachmentDto>? Attachments,
    TimelineMessageReplyDto? ReplyTo,
    MessageProperties? Properties,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    Guid ConversationId,
    bool IsPinned,
    IReadOnlyDictionary<string, int>? ReactionsCounts,
    IReadOnlyList<string>? UserReactions
);

// public sealed partial record TimelineMessageDto {
//     [Required] public Guid Id { get; set; } = Id;
//     [Required] public MessageType Type { get; set; } = Type;
//     [Required] public TimelineMessageSenderDto? Sender { get; set; } = Sender;
//     [Required] public string? Body { get; set; } = Body;
//     public IList<MessageAttachmentDto> Attachments { get; set; } = Attachments;
//     [Required] public DateTimeOffset CreatedAt { get; set; } = CreatedAt;
//     [Required] public DateTimeOffset? UpdatedAt { get; set; } = UpdatedAt;
//     [Required] public TimelineMessageReplyDto? ReplyTo { get; set; } = ReplyTo;
//     [Required] public MessageProperties? Properties { get; set; } = Properties;
//     [Required] public Guid ConversationId { get; set; } = ConversationId;
//     [Required, MapFrom("PinnedAt != null")] public bool IsPinned { get; set; }
//     [Required] public IReadOnlyDictionary<string, int> ReactionsCounts { get; set; }
//     [Required] public IReadOnlyList<string> UserReactions { get; set; }
// }