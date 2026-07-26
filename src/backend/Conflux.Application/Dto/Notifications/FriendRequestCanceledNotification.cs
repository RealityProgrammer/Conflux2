using Mediator;

namespace Conflux.Application.Dto.Notifications;

public sealed record FriendRequestCanceledNotification(Guid SenderUserId, Guid ReceiverUserId) : INotification;