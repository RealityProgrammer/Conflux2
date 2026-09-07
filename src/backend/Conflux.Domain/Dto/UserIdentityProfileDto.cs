using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(ApplicationUser), Include = [
    nameof(ApplicationUser.Id),
    nameof(ApplicationUser.UserName),
    nameof(ApplicationUser.DisplayName),
    nameof(ApplicationUser.HasAvatar),
])]
public sealed partial record UserIdentityProfileDto;