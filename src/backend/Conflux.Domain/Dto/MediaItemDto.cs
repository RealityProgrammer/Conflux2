using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(MediaItem), Include = [
    nameof(MediaItem.Version),
    nameof(MediaItem.ContentType),
    nameof(MediaItem.Order),
], PreserveRequiredProperties = false)]
public sealed partial record MediaItemDto {
    [Required] public short Version { get; set; } = Version;
    [Required] public short Order { get; set; } = Order;
    [Required] public string ContentType { get; set; } = ContentType;
}