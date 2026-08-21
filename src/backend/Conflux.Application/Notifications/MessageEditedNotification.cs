using Conflux.Domain.Dto;

namespace Conflux.Application.Notifications;

public sealed record MessageEditedNotification(Guid ChannelId, MessageDto Message) : INotification;