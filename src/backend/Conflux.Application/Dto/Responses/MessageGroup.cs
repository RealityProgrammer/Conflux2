using Conflux.Domain;

namespace Conflux.Application.Dto.Responses;

public record MessageGroup(
    Guid SenderUserId,
    List<MessageElement> Messages
);

public record MessageElement(
    Guid Id,
    string? Body,
    Attachment[] Attachments,
    DateTimeOffset CreatedAt
);