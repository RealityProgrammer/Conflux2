using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(CommunityServer), Include = [
    nameof(CommunityServer.Id),
    nameof(CommunityServer.Name),
    nameof(CommunityServer.Description),
    nameof(CommunityServer.HasAvatar),
])]
public sealed partial record CommunityServerProfileDto;