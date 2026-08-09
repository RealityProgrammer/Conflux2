namespace Conflux.Domain.Dto;

public sealed record PagedTimelineMessageResult(
    List<TimelineMessageProjection> Messages, 
    bool? HasMoreBefore, 
    bool? HasMoreAfter
);