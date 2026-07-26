using Mediator;

namespace Conflux.Application.Dto.Events;

public sealed record FriendRequestAcceptedEvent(
    Guid AcceptorUserId, 
    Guid RequesterUserId
) : INotification;