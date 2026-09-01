using Conflux.Domain.Dto;

namespace Conflux.Application.Features.Notifications;

public sealed record MessageEditedNotification(Guid ChannelId, MessageDto Message) : INotification;