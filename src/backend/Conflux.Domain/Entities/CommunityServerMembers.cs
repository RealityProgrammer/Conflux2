using Conflux.Domain.Enums;

namespace Conflux.Domain.Entities;

public class CommunityServerMember : IHasCreatedAt {
    public Guid Id { get; set; }
    
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    
    public Guid CommunityServerId { get; set; }
    public CommunityServer CommunityServer { get; set; } = null!;

    public DateTimeOffset CreatedAt { get; set; } 
    
    public MembershipStatus Status { get; set; }
    public DateTimeOffset? BanExpireAt { get; set; }

    public virtual ICollection<CommunityServerMemberRole> MemberRoles { get; set; } = [];
    public virtual ICollection<CommunityServerRole> Roles { get; set; } = [];
}