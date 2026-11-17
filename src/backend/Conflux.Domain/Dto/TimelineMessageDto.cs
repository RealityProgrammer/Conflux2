using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using System.Text.Json.Serialization;

namespace Conflux.Domain.Dto;

public sealed record TimelineMessageDto(
    Guid Id,
    MessageType Type,
    TimelineMessageSenderDto? Sender,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Body,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] IList<MessageAttachmentDto>? Attachments,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] TimelineMessageReplyDto? ReplyTo,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] MessageProperties? Properties,
    DateTimeOffset CreatedAt,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)] DateTimeOffset? UpdatedAt,
    Guid ConversationId,
    bool IsPinned,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] IReadOnlyDictionary<string, int>? ReactionsCounts,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] IReadOnlyList<string>? UserReactionKeys
);
