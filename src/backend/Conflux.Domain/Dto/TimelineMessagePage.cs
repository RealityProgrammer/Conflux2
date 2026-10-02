using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

public sealed record TimelineMessagePage(
    [Required] List<TimelineMessageDto> Messages, 
    [Required] bool? HasMoreBefore, 
    [Required] bool? HasMoreAfter
);