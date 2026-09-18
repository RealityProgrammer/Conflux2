using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(Channel), Include = [
    nameof(Channel.Id),
    nameof(Channel.Name),
    nameof(Channel.Type),
    nameof(Channel.ChannelCategoryId),
])]
public sealed partial record ServerChannelIdentityDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required, MapFrom(nameof(Channel.Name))] public string Name { get; set; } = Name;
    [Required, MapFrom(nameof(Channel.Type))] public ChannelType ChannelType { get; set; } = ChannelType;
    [Required, MapFrom(nameof(Channel.ChannelCategoryId))] public Guid? CategoryId { get; set; } = CategoryId;
}