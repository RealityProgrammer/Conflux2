using Conflux.Domain.Enums;

namespace Conflux.Domain.Entities;

public sealed class UserAccountDeletion : IHasCreatedAt {
    public Guid Id { get; set; }
    
    public UserAccountDeleteReason Reason { get; set; }
    public UserAccountDeleteStatus Status { get; set; }
    public string? ExtraMessage { get; set; }
    
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? AppliedAt { get; set; }
}