namespace Conflux.Domain.Entities;

public class CommunityServerMemberRole {
    public Guid RoleId { get; set; }
    public CommunityServerRole Role { get; set; } = null!;
    
    public Guid MemberId { get; set; }
    public CommunityServerMember Member { get; set; } = null!;
}