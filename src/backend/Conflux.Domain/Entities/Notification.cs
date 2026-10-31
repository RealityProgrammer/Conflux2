using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using System.Text.Json.Serialization;

namespace Conflux.Domain.Entities;

[JsonDerivedType(typeof(MentionNotificationPayload), "mention")]
public abstract record NotificationPayload;

public sealed record MentionNotificationPayload(MentionSource Source) : NotificationPayload;

public class Notification : IHasCreatedAt {
    public Guid Id { get; set; }
    
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    
    public NotificationType Type { get; set; }
    public NotificationPayload Payload { get; set; } = null!;
    
    public bool IsRead { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; }
}