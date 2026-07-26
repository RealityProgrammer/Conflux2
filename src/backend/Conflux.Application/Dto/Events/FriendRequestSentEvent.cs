using Mediator;

namespace Conflux.Application.Dto.Events;

public sealed record FriendRequestSentEvent(
    Guid SenderUserId, 
    Guid ReceiverUserId
) : INotification;