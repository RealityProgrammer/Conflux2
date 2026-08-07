using Conflux.Domain;
using Conflux.Domain.Entities;

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