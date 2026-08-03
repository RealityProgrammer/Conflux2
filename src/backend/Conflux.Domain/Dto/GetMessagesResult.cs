namespace Conflux.Domain.Dto;

public sealed record GetMessagesResult(
    List<MessageDto> Messages, 
    Dictionary<Guid, UserBasicProfileSummary> Users,
    bool? HasMoreBefore, 
    bool? HasMoreAfter
);