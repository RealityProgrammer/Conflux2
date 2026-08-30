using Conflux.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Entities;

public class CommunityServerRole : IHasCreatedAt {
    public Guid Id { get; set; }

    [MaxLength(32)] public string Name { get; set; } = null!;
    
    public Guid CommunityServerId { get; set; }
    public CommunityServer CommunityServer { get; set; } = null!;

    public DateTimeOffset CreatedAt { get; set; }

    public int AuthorizeLevel { get; set; }
    public SpecialRoleType SpecialRoleType { get; set; }

    public ApplicationUser? CreatorUser { get; set; }
    public Guid? CreatorUserId { get; set; }
    
    public virtual ICollection<RolePermission> Permissions { get; set; } = [];
    public virtual ICollection<CommunityServerMemberRole> MembersWithRole { get; set; } = [];
    public virtual ICollection<CommunityServerMember> Members { get; set; } = [];
}