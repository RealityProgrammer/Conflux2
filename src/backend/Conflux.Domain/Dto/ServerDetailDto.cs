using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(CommunityServer), Include = [
    nameof(CommunityServer.Name),
    nameof(CommunityServer.Description),
    nameof(CommunityServer.HasAvatar),
    nameof(CommunityServer.ChannelCategories),
], NestedFacets = [
    typeof(ChannelCategoryDetailDto),
])]
public sealed partial record ServerDetailDto;