using Conflux.Domain.Dto;

namespace Conflux.Application.Features.Notifications;

public sealed record MessageReceivedNotification(Guid ChannelId, MessageDto Message) : INotification;