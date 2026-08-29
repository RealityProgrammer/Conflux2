using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Entities;

public class CommunityServer : IHasCreatedAt {
    public Guid Id { get; set; }

    [Required, MaxLength(48)] public string Name { get; set; } = null!;
    [MaxLength(128)] public string? Description { get; set; }
    public bool HasAvatar { get; set; }
    
    public Guid CreatorUserId { get; set; }
    [Required] public ApplicationUser CreatorUser { get; set; } = null!;
    
    public Guid OwnerUserId { get; set; }
    [Required] public ApplicationUser OwnerUser { get; set; } = null!;

    public DateTimeOffset CreatedAt { get; set; }

    public virtual ICollection<ChannelCategory> ChannelCategories { get; set; } = [];
    public virtual ICollection<Channel> Channels { get; set; } = [];
    public virtual ICollection<CommunityServerMember> Members { get; set; } = [];
    public virtual ICollection<Invitation> Invitations { get; set; } = [];
    public virtual ICollection<CommunityServerRole> Roles { get; set; } = [];
}