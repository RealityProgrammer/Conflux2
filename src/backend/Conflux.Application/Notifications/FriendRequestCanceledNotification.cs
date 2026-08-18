using Mediator;

namespace Conflux.Application.Notifications;

public sealed record FriendRequestCanceledNotification(Guid SenderUserId, Guid ReceiverUserId) : INotification;