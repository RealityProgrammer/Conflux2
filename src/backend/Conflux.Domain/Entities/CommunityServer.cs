namespace Conflux.Domain.Entities;

public class CommunityServer : IHasCreatedAt {
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    
    public Guid CreatorUserId { get; set; }
    public ApplicationUser CreatorUser { get; set; } = null!;
    
    public Guid OwnerUserId { get; set; }
    public ApplicationUser OwnerUser { get; set; } = null!;
    
    public Guid? AvatarId { get; set; }
    public MediaItem? Avatar { get; set; }
    
    public Guid? BannerId { get; set; }
    public MediaItem? Banner { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public virtual ICollection<ChannelCategory> ChannelCategories { get; set; } = [];
    public virtual ICollection<Channel> Channels { get; set; } = [];
    public virtual ICollection<CommunityServerMember> Members { get; set; } = [];
    public virtual ICollection<Invitation> Invitations { get; set; } = [];
    public virtual ICollection<CommunityServerRole> Roles { get; set; } = [];
    public virtual ICollection<ServerModerationLog> ModerationLogs { get; set; } = [];
    public virtual ICollection<Emoji> Emojis { get; set; } = [];
}