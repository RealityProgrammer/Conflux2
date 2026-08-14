using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Conflux.Domain.Entities;

public class ApplicationUser : IdentityUser<Guid>, IHasCreatedAt {
    public bool IsProfileSetup { get; set; }
    
    public DateTimeOffset? AvatarUpdatedAt { get; set; }
    public bool HasAvatar { get; set; }
    
    [MaxLength(64)] public string? DisplayName { get; set; }
    [MaxLength(255)] public string? Biography { get; set; }
    [MaxLength(32)] public string? Pronouns { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public virtual ICollection<FriendRequest> SentFriendRequests { get; set; } = [];
    public virtual ICollection<FriendRequest> ReceivedFriendRequests { get; set; } = [];
    
    [NotMapped]
    public IEnumerable<FriendRequest> FriendRequests => SentFriendRequests.Concat(ReceivedFriendRequests);
}