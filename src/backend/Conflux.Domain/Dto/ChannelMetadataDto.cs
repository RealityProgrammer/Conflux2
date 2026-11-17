using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(Channel), Include = [
    nameof(Channel.Id),
    nameof(Channel.Type),
])]
public sealed partial class ChannelMetadataDto;