using Microsoft.AspNetCore.Identity;

namespace Conflux.Domain;

public sealed class ApplicationUser : IdentityUser<Guid> {
    public bool IsProfileSetup { get; set; }
    
    public DateTimeOffset? AvatarUpdatedAt { get; set; }
}