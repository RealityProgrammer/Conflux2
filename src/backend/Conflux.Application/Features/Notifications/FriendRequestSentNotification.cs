namespace Conflux.Application.Features.Notifications;

public sealed record FriendRequestSentNotification(Guid SenderUserId, Guid ReceiverUserId) : INotification;