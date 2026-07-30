namespace Conflux.Domain;

public class ChannelMember : IHasCreatedAt {
    public Guid ChannelId { get; set; }
    public Channel Channel { get; set; } = null!;
    
    public Guid UserId { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; }
}