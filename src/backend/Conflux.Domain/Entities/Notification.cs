using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using System.Text.Json.Serialization;

namespace Conflux.Domain.Entities;

[JsonDerivedType(typeof(MentionNotificationPayload), "mention")]
public interface INotificationPayload {
    public string TypeName => GetType().Name;   // to make HotChocolate shut up about INotificationPayload has to at least define one field
}

public sealed record MentionNotificationPayload(MentionMessageSource Source) : INotificationPayload;

public class Notification : IHasCreatedAt {
    public Guid Id { get; set; }
    
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    
    public NotificationType Type { get; set; }
    public INotificationPayload Payload { get; set; } = null!;
    
    public bool IsRead { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
}