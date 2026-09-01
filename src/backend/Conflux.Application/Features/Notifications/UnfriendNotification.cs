namespace Conflux.Application.Features.Notifications;

public sealed record UnfriendNotification(Guid InvokerUserId, Guid OtherUserId) : INotification;