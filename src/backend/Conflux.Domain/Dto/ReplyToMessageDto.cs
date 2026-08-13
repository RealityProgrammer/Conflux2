namespace Conflux.Domain.Dto;

public sealed record ReplyToMessageDto(
    Guid MessageId, 
    Guid SenderUserId, 
    string? BodySnippet, 
    bool HasMoreBody,
    int AttachmentCount
);