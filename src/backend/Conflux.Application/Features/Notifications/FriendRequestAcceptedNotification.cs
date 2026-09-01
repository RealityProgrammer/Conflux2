namespace Conflux.Application.Features.Notifications;

public sealed record FriendRequestAcceptedNotification(Guid AcceptorUserId, Guid SenderUserId) : INotification;