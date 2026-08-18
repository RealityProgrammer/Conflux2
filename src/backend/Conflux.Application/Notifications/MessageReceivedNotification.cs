using Conflux.Domain.Dto;
using Mediator;

namespace Conflux.Application.Notifications;

public sealed record MessageReceivedNotification(Guid ChannelId, MessageDto Message) : INotification;