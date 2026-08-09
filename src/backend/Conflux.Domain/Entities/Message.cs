using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Entities;

public class Message : IHasCreatedAt {
    public Guid Id { get; set; }
    [MaxLength(1024)] public string? Body { get; set; }

    public Attachment[] Attachments { get; set; } = [];
    
    public Guid SenderUserId { get; set; }
    public ApplicationUser Sender { get; set; } = null!;
    
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;
    
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    
    public Guid? ReplyToId { get; set; }
    public Message? ReplyTo { get; set; }
    
    /// <summary>
    /// Messages that reply to this message instance.
    /// </summary>
    public virtual ICollection<Message> Replies { get; set; }
}