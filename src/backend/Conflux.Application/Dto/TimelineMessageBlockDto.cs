using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Application.Dto;

public sealed record TimelineMessageClusterDto(
    Guid SenderUserId,
    List<TimelineMessageClusterItemDto> Messages
);

public sealed record TimelineMessageClusterItemDto(
    Guid Id,
    string? Body,
    Attachment[] Attachments,
    DateTimeOffset CreatedAt,
    ReplyToMessageDto? ReplyTo
);