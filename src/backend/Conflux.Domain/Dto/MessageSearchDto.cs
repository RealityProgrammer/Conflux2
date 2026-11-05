using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(Message), Include = [
    nameof(Message.Id),
    nameof(Message.Body),
    nameof(Message.Sender),
    nameof(Message.CreatedAt),
], NestedFacets = [
    typeof(UserIdentityProfileDto),
])]
public sealed partial record MessageSearchDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public string? Body { get; set; } = Body;
    [Required] public UserIdentityProfileDto Sender { get; set; } = Sender!;
    [Required] public DateTimeOffset CreatedAt { get; set; } = CreatedAt;
}