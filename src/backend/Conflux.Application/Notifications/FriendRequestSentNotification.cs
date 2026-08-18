using Mediator;

namespace Conflux.Application.Notifications;

public sealed record FriendRequestSentNotification(Guid SenderUserId, Guid ReceiverUserId) : INotification;