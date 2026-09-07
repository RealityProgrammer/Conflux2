using Conflux.Domain.Entities;

namespace Conflux.Domain.Dto;

public record TimelineMessageDto(
    Guid Id,
    Guid SenderUserId,
    string? Body,
    Attachment[] Attachments,
    DateTimeOffset CreatedAt,
    ReplyToMessageDto? ReplyTo
);