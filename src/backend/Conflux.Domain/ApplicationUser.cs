using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain;

public sealed class ApplicationUser : IdentityUser<Guid> {
    public bool IsProfileSetup { get; set; }
    
    public DateTimeOffset? AvatarUpdatedAt { get; set; }
    public bool HasAvatar { get; set; }
    
    [MaxLength(64)] public string? DisplayName { get; set; }
    [MaxLength(255)] public string? Biography { get; set; }
    [MaxLength(32)] public string? Pronouns { get; set; }
}