namespace Conflux.Application.Notifications;

public sealed record MessageDeletedNotification(Guid ChannelId, Guid MessageId) : INotification;