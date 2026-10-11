namespace Conflux.Domain.Dto;

public sealed record DirectConversationSummary(
    Guid ConversationId,
    UserIdentityProfileDto PeerProfile
);