using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain;

public class Message : IHasCreatedAt {
    public Guid Id { get; set; }
    [MaxLength(1024)] public string? Body { get; set; }

    public Guid[] AttachmentIds { get; set; } = [];
    
    public Guid SenderUserId { get; set; }
    public ApplicationUser Sender { get; set; } = null!;
    
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;
    
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}