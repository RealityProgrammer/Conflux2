using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(ChannelCategory), Include = [], NestedFacets = [
    typeof(ServerChannelIdentityDto),
], NullableProperties = true, GenerateParameterlessConstructor = false)]
public sealed partial record ChannelCategoryDetailDto {
    [Required] public Guid? Id { get; set; }
    [Required] public string? Name { get; set; }
    [Required] public ICollection<ServerChannelIdentityDto> Channels { get; set; }
}