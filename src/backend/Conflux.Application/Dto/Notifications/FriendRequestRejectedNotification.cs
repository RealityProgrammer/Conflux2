using Mediator;

namespace Conflux.Application.Dto.Notifications;

public sealed record FriendRequestRejectedNotification(Guid RejecterUserId, Guid SenderUserId) : INotification;