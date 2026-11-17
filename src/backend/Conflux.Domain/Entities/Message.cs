using Conflux.Domain.Enums;
using NpgsqlTypes;

namespace Conflux.Domain.Entities;

public class Message : IHasCreatedAt {
    public Guid Id { get; set; }
    public MessageType Type { get; set; }
    
    public string? Body { get; set; }
    public virtual IList<MediaItem> Attachments { get; set; } = [];
    public NpgsqlTsVector SearchVector { get; set; } = null!;
    
    public MessageProperties? Properties { get; set; }
    
    public Guid? SenderUserId { get; set; }
    public ApplicationUser? Sender { get; set; }
    
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;
    
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    
    public Guid? ReplyToId { get; set; }
    public Message? ReplyTo { get; set; }
    public virtual ICollection<Message> Replies { get; set; } = null!;

    public ICollection<MessageReaction> Reaction { get; set; } = [];
    
    public DateTimeOffset? PinnedAt { get; set; }
}