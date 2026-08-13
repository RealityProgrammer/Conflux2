using Conflux.Domain.Entities;
using System.Text.Json.Serialization;

namespace Conflux.Domain.Dto;

public sealed record TimelineMessageProjection(
    Guid Id,
    Guid SenderUserId,
    
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Body,
    Attachment[] Attachments,
    
    DateTimeOffset CreatedAt,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] ReplyToMessageDto? ReplyTo
);