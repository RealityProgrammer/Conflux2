using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(MediaItem), Include = [
    nameof(MediaItem.Id),
    nameof(MediaItem.FileName),
    nameof(MediaItem.ContentType),
], PreserveRequiredProperties = false)]
public sealed partial record MessageAttachmentDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public string FileName { get; set; } = FileName;
    [Required] public string ContentType { get; set; } = ContentType;
}