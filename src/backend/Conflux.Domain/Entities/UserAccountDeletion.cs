using Conflux.Domain.Enums;

namespace Conflux.Domain.Entities;

public class UserAccountDeletion : IHasCreatedAt {
    public Guid Id { get; set; }
    
    public UserAccountDeleteReason Reason { get; set; }
    public required UserAccountDeleteStatus Status { get; set; }
    public string? ExtraMessage { get; set; }
    
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;

    public required string? RestorationPasswordHash { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? AppliedAt { get; set; }
}