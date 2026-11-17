// ReSharper disable EntityFramework.ModelValidation.UnlimitedStringLength

using Conflux.Domain.Enums;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Domain.Entities;

public class ApplicationUser : IdentityUser<Guid>, IHasCreatedAt {
    public bool IsUserNameLocked { get; set; }

    public int? AvatarVersion { get; set; }
    public int? BannerVersion { get; set; }

    public string? DisplayName { get; set; } = null!;
    public string? Biography { get; set; }
    public string? Pronouns { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    
    // manual != current
    public PresenceStatus ManualPresenceStatus { get; set; } = PresenceStatus.Online;
    public DateTimeOffset LastSeenAt { get; set; }

    public virtual ICollection<FriendRequest> SentFriendRequests { get; set; } = [];
    public virtual ICollection<FriendRequest> ReceivedFriendRequests { get; set; } = [];
    public virtual ICollection<CommunityServerMember> JoinedCommunityServers { get; set; } = [];
    public virtual ICollection<ConversationParticipant> ConversationParticipants { get; set; } = [];
    public virtual ICollection<UserAccountDeletion> AccountDeletions { get; set; } = [];
    public virtual ICollection<Notification> Notifications { get; set; } = [];
}