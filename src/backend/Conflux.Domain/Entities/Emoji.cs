namespace Conflux.Domain.Entities;

public class Emoji : IHasCreatedAt {
    public Guid Id { get; set; }
    public string ShortCode { get; set; } = null!;
    
    public required Guid ServerId { get; set; }
    public CommunityServer Server { get; set; } = null!;
    
    public required Guid CreatorId { get; set; }
    public ApplicationUser Creator { get; set; } = null!;

    public DateTimeOffset CreatedAt { get; set; }
}