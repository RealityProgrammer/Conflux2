namespace Conflux.Domain.Dto;

public sealed record DmConversationContext(
    Guid ChannelId,
    Guid ConversationId,
    Guid FriendRequestId,
    Guid SenderUserId,
    Guid ReceiverUserId,
    Guid OtherUserId,
    bool IsFriended
);