using Conflux.Domain.Dto;

namespace Conflux.Application.Notifications;

public sealed record MessageReceivedNotification(Guid ChannelId, MessageDto Message) : INotification;