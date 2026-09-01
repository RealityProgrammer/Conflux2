namespace Conflux.Application.Features.Notifications;

public sealed record FriendRequestRejectedNotification(Guid RejecterUserId, Guid SenderUserId) : INotification;