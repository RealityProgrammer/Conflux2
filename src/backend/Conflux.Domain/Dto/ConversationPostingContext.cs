using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record DMConversationContext(
    Guid SenderUserId,
    Guid ReceiverUserId,
    bool IsFriended
);

public sealed record ConversationPostingContext(
    Guid ChannelId,
    ChannelType ChannelType,
    DMConversationContext? DmContext,
    Guid ConversationId
);