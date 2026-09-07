using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Application.Dto;

[Facet(typeof(CommunityServer), Include = [
    nameof(CommunityServer.Id),
    nameof(CommunityServer.Name),
    nameof(CommunityServer.HasAvatar),
])]
public sealed partial record ServerIdentityDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public string Name { get; set; } = Name;
    [Required] public bool HasAvatar { get; set; } = HasAvatar;
}