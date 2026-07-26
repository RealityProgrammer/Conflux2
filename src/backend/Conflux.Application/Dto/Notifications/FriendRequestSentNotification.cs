using Mediator;

namespace Conflux.Application.Dto.Notifications;

public sealed record FriendRequestSentNotification(Guid SenderUserId, Guid ReceiverUserId) : INotification;