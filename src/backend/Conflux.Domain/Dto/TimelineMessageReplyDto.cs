namespace Conflux.Domain.Dto;

public sealed record TimelineMessageReplyDto(
    Guid Id, 
    TimelineMessageSenderDto Sender,
    string? Body,
    int AttachmentsCount
);