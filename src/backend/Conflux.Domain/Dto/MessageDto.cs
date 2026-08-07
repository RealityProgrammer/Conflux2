using Conflux.Domain.Entities;

namespace Conflux.Domain.Dto;

public record MessageDto(
    Guid Id,
    Guid SenderUserId,
    string? Body,
    Attachment[] Attachments,
    DateTimeOffset CreatedAt
);