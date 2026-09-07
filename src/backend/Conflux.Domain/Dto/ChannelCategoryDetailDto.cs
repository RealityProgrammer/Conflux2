using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(ChannelCategory), Include = [
    nameof(ChannelCategory.Channels),
], NestedFacets = [
    typeof(ServerChannelIdentityDto),
])]
public sealed partial record ChannelCategoryDetailDto {
    [MapFrom(nameof(ChannelCategory.Id))] public Guid? Id { get; set; }
    [MapFrom(nameof(ChannelCategory.Name))] public string? Name { get; set; }
}