using Conflux.Domain.Entities;

namespace Conflux.Application.Dto.Responses;

public record TimelineMessageBlockDto(
    Guid SenderUserId,
    List<TimelineMessageDto> Messages
);

public record TimelineMessageDto(
    Guid Id,
    string? Body,
    Attachment[] Attachments,
    DateTimeOffset CreatedAt
);