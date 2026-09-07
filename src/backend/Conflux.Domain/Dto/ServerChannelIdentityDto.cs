using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(Channel), Include = [
    nameof(Channel.Id),
    nameof(Channel.Name),
])]
public sealed partial class ServerChannelIdentityDto {
    [MapFrom(nameof(Channel.Type))]
    public ChannelType ChannelType { get; set; }
    
    [MapFrom(nameof(Channel.ChannelCategoryId))]
    public Guid? CategoryId { get; set; }
}