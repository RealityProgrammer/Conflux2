using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(Attachment), Include = [
    nameof(Attachment.Id),
    nameof(Attachment.Name),
    nameof(Attachment.Type),
])]
public sealed partial record AttachmentDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public string Name { get; set; } = Name;
    [Required] public string Type { get; set; } = Type;
}