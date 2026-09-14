using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

public sealed record FriendRequestRejectedEvent(Guid RejecterUserId);

internal sealed class FriendRequestRejectedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<FriendRequestRejectedNotification> {
    public async ValueTask Handle(FriendRequestRejectedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.SenderUserId.ToString()).FriendRequestRejected(
            new(notification.RejecterUserId),
            cancellationToken: cancellationToken
        );
    }
}