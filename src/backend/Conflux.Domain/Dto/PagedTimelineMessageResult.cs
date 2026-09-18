namespace Conflux.Domain.Dto;

public sealed record PagedTimelineMessageResult(
    List<TimelineMessageDto> Messages, 
    bool? HasMoreBefore, 
    bool? HasMoreAfter
);