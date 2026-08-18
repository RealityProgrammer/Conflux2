using Conflux.Domain.Dto;
using Mediator;

namespace Conflux.Application.Notifications;

public sealed record MessageEditedNotification(Guid ChannelId, MessageDto Message) : INotification;