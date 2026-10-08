using Conflux.Domain.Enums;

namespace Conflux.Domain.Entities;

public class Channel : IHasCreatedAt {
    public Guid Id { get; set; }
    
    public ChannelType Type { get; set; }

    public string? Name { get; set; }
    
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;
    
    public Guid CommunityServerId { get; set; }
    public CommunityServer CommunityServer { get; set; } = null!;
    
    public Guid? ChannelCategoryId { get; set; }
    public ChannelCategory? ChannelCategory { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}