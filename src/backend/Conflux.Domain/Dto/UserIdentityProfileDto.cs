using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(ApplicationUser), Include = [
    nameof(ApplicationUser.Id),
    nameof(ApplicationUser.UserName),
    nameof(ApplicationUser.DisplayName),
    nameof(ApplicationUser.HasAvatar),
], PreserveRequiredProperties = false, CopyDocs = false)]
public sealed partial record UserIdentityProfileDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public string? UserName { get; set; } = UserName;
    [Required] public string? DisplayName { get; set; } = DisplayName;
    [Required] public bool HasAvatar { get; set; } = HasAvatar;
}