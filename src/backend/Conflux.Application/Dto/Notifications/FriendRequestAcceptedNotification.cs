using Mediator;

namespace Conflux.Application.Dto.Notifications;

public sealed record FriendRequestAcceptedNotification(Guid AcceptorUserId, Guid SenderUserId) : INotification;