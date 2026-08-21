namespace Conflux.Application.Notifications;

public sealed record UnfriendNotification(Guid InvokerUserId, Guid OtherUserId) : INotification;