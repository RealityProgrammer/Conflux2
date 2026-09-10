using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Entities;

public class CommunityServerBan : IHasCreatedAt {
    public Guid Id { get; set; }
    
    public Guid BannedMemberId { get; set; }
    public CommunityServerMember BannedMember { get; set; } = null!;
    
    public Guid? ExecutorMemberId { get; set; }
    public CommunityServerMember? ExecutorMember { get; set; }
    
    [MaxLength(256)] public string? Reason { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; }
    public TimeSpan? Duration { get; set; }
    public bool IsActive { get; set; }
}