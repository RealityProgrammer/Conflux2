using System.ComponentModel.DataAnnotations;
using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(ApplicationUser), Include = [
    nameof(ApplicationUser.Id),
    nameof(ApplicationUser.DisplayName),
    nameof(ApplicationUser.AvatarVersion),
], CopyDocs = false)]
public sealed partial record PinnedMessageSender {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public string? DisplayName { get; set; } = DisplayName;
    [Required] public int? AvatarVersion { get; set; } = AvatarVersion;
}

[Facet(typeof(Message), Include = [
    nameof(Message.Id),
    nameof(Message.Body),
    nameof(Message.Sender),
    nameof(Message.CreatedAt),
    nameof(Message.PinnedAt),
], NestedFacets = [
    typeof(PinnedMessageSender),
])]
public sealed partial record PinnedMessageDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public string? Body { get; set; } = Body;
    [Required] public PinnedMessageSender? Sender { get; set; } = Sender;
    [Required] public DateTimeOffset CreatedAt { get; set; } = CreatedAt;
    [Required] public DateTimeOffset? PinnedAt { get; set; } = PinnedAt;
    [Required, MapFrom("Attachments == null ? 0 : Attachments.Count")] public int AttachmentsCount { get; set; }
}
