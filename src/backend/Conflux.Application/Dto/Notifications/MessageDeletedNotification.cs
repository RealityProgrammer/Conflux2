using Mediator;

namespace Conflux.Application.Dto.Notifications;

public sealed record MessageDeletedNotification(Guid ChannelId, Guid MessageId) : INotification;