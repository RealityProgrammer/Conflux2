using Mediator;

namespace Conflux.Application.Notifications;

public sealed record UpdateDmConversationListNotification(
    Guid SenderUserId,
    Guid ChannelId, 
    Guid ReceiverUserId,
    int UnreadCount
) : INotification;