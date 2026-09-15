using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(FriendRequestCanceledNotification), Include = [nameof(FriendRequestCanceledNotification.SenderUserId)])]
public sealed partial record FriendRequestCanceledEvent;

internal sealed class FriendRequestCanceledNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<FriendRequestCanceledNotification> {
    public async ValueTask Handle(FriendRequestCanceledNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.ReceiverUserId.ToString())
            .FriendRequestCanceled(new(notification), cancellationToken);
    }
}