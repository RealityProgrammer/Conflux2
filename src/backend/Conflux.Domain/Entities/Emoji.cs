namespace Conflux.Domain.Entities;

public class Emoji : IHasCreatedAt {
    public Guid Id { get; set; }
    public string ShortCode { get; set; }
    
    public Guid ServerId { get; set; }
    public CommunityServer Server { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}