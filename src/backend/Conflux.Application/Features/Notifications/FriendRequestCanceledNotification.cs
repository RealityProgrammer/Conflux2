namespace Conflux.Application.Features.Notifications;

public sealed record FriendRequestCanceledNotification(Guid SenderUserId, Guid ReceiverUserId) : INotification;