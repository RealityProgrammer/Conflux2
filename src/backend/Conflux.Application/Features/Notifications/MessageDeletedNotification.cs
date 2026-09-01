namespace Conflux.Application.Features.Notifications;

public sealed record MessageDeletedNotification(Guid ChannelId, Guid MessageId) : INotification;