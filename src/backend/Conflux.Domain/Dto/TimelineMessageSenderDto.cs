using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(ApplicationUser), Include = [
    nameof(ApplicationUser.Id),
    nameof(ApplicationUser.DisplayName),
    nameof(ApplicationUser.AvatarRevision),
], CopyDocs = false)]
public sealed partial record TimelineMessageSenderDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public string? DisplayName { get; set; } = DisplayName;
}