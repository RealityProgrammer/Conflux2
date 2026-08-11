using Conflux.Domain.Dto;
using Mediator;

namespace Conflux.Application.Dto.Notifications;

public sealed record UpdateDmConversationListNotification(
    Guid SenderUserId,
    Guid ChannelId, 
    Guid ReceiverUserId,
    int UnreadCount
) : INotification;