using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(ChannelCategory), Include = [
    nameof(ChannelCategory.Id),
    nameof(ChannelCategory.Name),
])]
public sealed partial record ChannelCategoryIdentityDto;