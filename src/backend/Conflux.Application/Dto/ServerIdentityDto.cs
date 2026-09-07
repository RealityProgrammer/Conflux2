using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Application.Dto;

[Facet(typeof(CommunityServer), Include = [
    nameof(CommunityServer.Id),
    nameof(CommunityServer.Name),
    nameof(CommunityServer.HasAvatar),
])]
public sealed partial record ServerIdentityDto;