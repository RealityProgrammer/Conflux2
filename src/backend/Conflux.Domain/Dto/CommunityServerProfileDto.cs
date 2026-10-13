using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(CommunityServer), Include = [
    nameof(CommunityServer.Id),
    nameof(CommunityServer.Name),
    nameof(CommunityServer.Description),
    nameof(CommunityServer.Avatar),
    nameof(CommunityServer.Banner),
], NestedFacets = [
    typeof(MediaItemDto),
])]
public sealed partial record CommunityServerProfileDto;