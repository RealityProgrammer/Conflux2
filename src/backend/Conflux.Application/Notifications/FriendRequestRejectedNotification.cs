namespace Conflux.Application.Notifications;

public sealed record FriendRequestRejectedNotification(Guid RejecterUserId, Guid SenderUserId) : INotification;