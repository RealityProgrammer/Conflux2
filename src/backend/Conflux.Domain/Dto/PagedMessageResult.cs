namespace Conflux.Domain.Dto;

public sealed record PagedMessageResult(
    List<MessageDto> Messages, 
    bool? HasMoreBefore, 
    bool? HasMoreAfter
);