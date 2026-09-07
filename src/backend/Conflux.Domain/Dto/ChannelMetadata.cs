using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(Channel), Include = [
    nameof(Channel.ConversationId),
])]
public sealed partial class ChannelMetadata {
    [MapFrom(nameof(Channel.Id))]
    public Guid ChannelId { get; set; }
    
    [MapFrom(nameof(Channel.Type))]
    public ChannelType ChannelType { get; set; }    
}