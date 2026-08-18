using Conflux.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Entities;

public class Channel : IHasCreatedAt {
    public Guid Id { get; set; }
    
    public ChannelType Type { get; set; }

    [MaxLength(32)] public string? Name { get; set; } = null!;
    
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;
    
    // TODO: Add community id or channel category property in the future once we got community implemented
    
    public Guid? FriendRequestId { get; set; }
    public FriendRequest? FriendRequest { get; set; }
    
    public Guid? CommunityServerId { get; set; }
    public CommunityServer? CommunityServer { get; set; }
    
    public Guid? ChannelCategoryId { get; set; }
    public ChannelCategory? ChannelCategory { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}