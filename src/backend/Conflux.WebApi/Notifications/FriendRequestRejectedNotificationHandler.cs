using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(FriendRequestRejectedNotification), Include = [nameof(FriendRequestRejectedNotification.RejecterUserId)])]
public sealed partial record FriendRequestRejectedEvent;

internal sealed class FriendRequestRejectedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<FriendRequestRejectedNotification> {
    public async ValueTask Handle(FriendRequestRejectedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.SenderUserId.ToString())
            .FriendRequestRejected(new(notification), cancellationToken);
    }
}