namespace Conflux.Domain.Dto;

public record MessageDto(
    Guid Id,
    Guid SenderUserId,
    string? Body,
    Guid[] AttachmentIds,
    DateTimeOffset CreatedAt
);