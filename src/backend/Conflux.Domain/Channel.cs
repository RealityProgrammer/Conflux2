namespace Conflux.Domain;

public class Channel : IHasCreatedAt {
    public Guid Id { get; set; }
    
    public ChannelType Type { get; set; }
    
    public string? Name { get; set; }
    
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;
    
    // TODO: Add community id or channel category property in the future once we got community implemented
    
    public Guid? FriendRequestId { get; set; }
    public FriendRequest? FriendRequest { get; set; }

    public virtual ICollection<ChannelMember> Members { get; set; } = null!;
    
    public DateTimeOffset CreatedAt { get; set; }
}