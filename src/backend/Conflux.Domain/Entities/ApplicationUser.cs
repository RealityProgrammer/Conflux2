using Conflux.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Entities;

public class ApplicationUser : IdentityUser<Guid>, IHasCreatedAt {
    public bool IsUserNameLocked { get; set; }

    public int? AvatarRevision { get; set; }
    public int? BannerRevision { get; set; }
    
    [MaxLength(32)] public string? DisplayName { get; set; }
    [MaxLength(255)] public string? Biography { get; set; }
    [MaxLength(32)] public string? Pronouns { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    
    // manual != current
    public PresenceStatus ManualPresenceStatus { get; set; } = PresenceStatus.Online;
    public DateTimeOffset LastSeenAt { get; set; }

    public virtual ICollection<FriendRequest> SentFriendRequests { get; set; } = [];
    public virtual ICollection<FriendRequest> ReceivedFriendRequests { get; set; } = [];
    public virtual ICollection<CommunityServerMember> JoinedCommunityServers { get; set; } = [];
}