using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Application.Dto;

public sealed record TimelineMessageClusterDto(
    Guid SenderUserId,
    List<TimelineMessageClusterItemDto> Messages
);

[Facet(typeof(TimelineMessageDto), Include = [
    nameof(TimelineMessageDto.Id),
    nameof(TimelineMessageDto.Body),
    nameof(TimelineMessageDto.Attachments),
    nameof(TimelineMessageDto.CreatedAt),
    nameof(TimelineMessageDto.ReplyTo),
], NestedFacets = [
    typeof(TimelineMessageReplyDto),
])]
public sealed partial record TimelineMessageClusterItemDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public string? Body { get; set; } = Body;
    [Required] public Attachment[] Attachments { get; set; } = Attachments;
    [Required] public DateTimeOffset CreatedAt { get; set; } = CreatedAt;
    [Required] public TimelineMessageReplyDto? ReplyTo { get; set; } = ReplyTo;
}