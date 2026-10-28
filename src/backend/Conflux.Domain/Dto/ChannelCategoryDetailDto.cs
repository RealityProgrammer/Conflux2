using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(ChannelCategory), Include = [
    nameof(ChannelCategory.Id),
    nameof(ChannelCategory.Name),
    nameof(ChannelCategory.Channels),
], NestedFacets = [
    typeof(ServerChannelIdentityDto),
], NullableProperties = true)]
public sealed partial record ChannelCategoryDetailDto {
    [Required] public Guid? Id { get; set; } = Id;
    [Required] public string? Name { get; set; } = Name;
    [Required] public ICollection<ServerChannelIdentityDto> Channels { get; set; } = Channels ?? [];
}