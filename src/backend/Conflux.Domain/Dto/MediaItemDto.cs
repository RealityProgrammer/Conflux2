using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(MediaItem), Include = [
    nameof(MediaItem.Version),
    nameof(MediaItem.ContentType),
], PreserveRequiredProperties = false)]
public sealed partial record MediaItemDto {
    [Required] public int Version { get; set; } = Version;
    [Required] public string ContentType { get; set; } = ContentType;
}