using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Friend;

[Facet(typeof(FriendRequestReceivedNotification), Include = [nameof(FriendRequestReceivedNotification.SenderUserId)])]
public sealed partial record FriendRequestReceivedEvent;

internal sealed class RequestSentNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<FriendRequestReceivedNotification> {
    public async ValueTask Handle(FriendRequestReceivedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.ReceiverUserId.ToString())
            .FriendRequestReceived(new(notification), cancellationToken);
    }
}