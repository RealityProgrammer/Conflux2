using Conflux.Domain.Dto;
using Mediator;

namespace Conflux.Application.Dto.Notifications;

public sealed record MessageReceivedNotification(Guid ChannelId, MessageDto Message) : INotification;