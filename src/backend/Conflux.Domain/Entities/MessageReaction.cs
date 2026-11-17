using Conflux.Domain.Enums;

namespace Conflux.Domain.Entities;

public class MessageReaction {
    public Guid Id { get; set; }
    
    public required Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;
    
    public required ReactionIconSourceType IconSource { get; set; }

    public string? UnicodeValue { get; set; }
    
    public Guid? EmojiId { get; set; }
    public Emoji? Emoji { get; set; }
    
    public HashSet<Guid> UserIds { get; set; } = [];
}