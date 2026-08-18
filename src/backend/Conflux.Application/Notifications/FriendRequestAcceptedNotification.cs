using Mediator;

namespace Conflux.Application.Notifications;

public sealed record FriendRequestAcceptedNotification(Guid AcceptorUserId, Guid SenderUserId) : INotification;