namespace Conflux.Domain.Entities;

public class CommunityServerMember : IHasCreatedAt {
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    
    public Guid CommunityServerId { get; set; }
    public CommunityServer CommunityServer { get; set; } = null!;

    public DateTimeOffset CreatedAt { get; set; }
}