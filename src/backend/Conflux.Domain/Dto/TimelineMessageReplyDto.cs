using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(Message), Include = [
    nameof(Message.Id),
    nameof(Message.Sender),
    nameof(Message.Body),
], NestedFacets = [
    typeof(TimelineMessageSenderDto),
], CopyDocs = false)]
public sealed partial record TimelineMessageReplyDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public TimelineMessageSenderDto Sender { get; set; } = Sender!;
    [Required] public string? Body { get; set; } = Body;
    [Required, MapFrom("Attachments == null ? 0 : Attachments.Count")]
    public int AttachmentCount { get; set; }
}