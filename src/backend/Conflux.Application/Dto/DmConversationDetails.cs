using Conflux.Domain.Dto;

namespace Conflux.Application.Dto;

public sealed record DmConversationDetails(
    UserIdentityProfileDto PeerProfile,
    Guid ConversationId,
    bool IsFriended
);