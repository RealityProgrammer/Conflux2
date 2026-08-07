using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record DMConversationContext(
    Guid OtherUserId,
    bool IsFriended
);

public sealed record ConversationPostingContext(
    Guid ChannelId,
    ChannelType ChannelType,
    DMConversationContext? DmContext,
    Guid ConversationId
);