using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(ApplicationUser), Include = [
    nameof(ApplicationUser.Id),
    nameof(ApplicationUser.UserName),
    nameof(ApplicationUser.DisplayName),
    nameof(ApplicationUser.AvatarRevision),
    nameof(ApplicationUser.BannerRevision),
], PreserveRequiredProperties = false, CopyDocs = false)]
public sealed partial record UserIdentityProfileDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public string? UserName { get; set; } = UserName;
    [Required] public string? DisplayName { get; set; } = DisplayName;
    [Required] public int? AvatarRevision { get; set; } = AvatarRevision;
    [Required] public int? BannerRevision { get; set; } = BannerRevision;
}