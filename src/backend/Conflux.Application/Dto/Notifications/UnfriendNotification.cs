using Mediator;

namespace Conflux.Application.Dto.Notifications;

public sealed record UnfriendNotification(Guid InvokerUserId, Guid OtherUserId) : INotification;