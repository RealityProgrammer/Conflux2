using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Application.Dto.Responses;

public sealed record TimelineMessageBlockDto(
    Guid SenderUserId,
    List<TimelineMessageDto> Messages
);

public sealed record TimelineMessageDto(
    Guid Id,
    string? Body,
    Attachment[] Attachments,
    DateTimeOffset CreatedAt,
    ReplyToMessageProjection? ReplyTo
);