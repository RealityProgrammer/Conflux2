using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(ChannelCategory), Include = [
    nameof(ChannelCategory.Id),
    nameof(ChannelCategory.Name),
])]
public sealed partial record ChannelCategoryIdentityDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public string Name { get; set; } = Name;
}