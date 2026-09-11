using Conflux.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Entities;

public class ServerModerationLog : IHasCreatedAt {
    public Guid Id { get; set; }
    
    public Guid? ExecutorMemberId { get; set; }
    public CommunityServerMember? ExecutorMember { get; set; }
    
    public Guid? AffectedMemberId { get; set; }
    public CommunityServerMember? AffectedMember { get; set; }
    
    public ServerModerationAction Action { get; set; }
    [MaxLength(256)] public string? Reason { get; set; }
    public TimeSpan? BanDuration { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; }
}