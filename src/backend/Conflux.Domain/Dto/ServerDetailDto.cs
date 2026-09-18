using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(CommunityServer), Include = [
    nameof(CommunityServer.Name),
    nameof(CommunityServer.Description),
    nameof(CommunityServer.HasAvatar),
    nameof(CommunityServer.ChannelCategories),
], NestedFacets = [
    typeof(ChannelCategoryDetailDto),
])]
public sealed partial record ServerDetailDto {
    [Required] public string Name { get; set; } = Name;
    [Required] public string? Description { get; set; } = Description;
    [Required] public bool HasAvatar { get; set; } = HasAvatar;
    [Required] public ICollection<ChannelCategoryDetailDto> ChannelCategories { get; set; } = ChannelCategories;
}