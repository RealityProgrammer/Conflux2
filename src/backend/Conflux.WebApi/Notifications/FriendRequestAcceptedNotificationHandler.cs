using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Facet;
using Facet.Extensions;
using Facet.Mapping;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(FriendRequestAcceptedNotification), Include = [nameof(FriendRequestAcceptedNotification.AcceptorUserId)])]
public sealed partial record FriendRequestAcceptedEvent;

internal sealed class FriendRequestAcceptedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<FriendRequestAcceptedNotification> {
    public async ValueTask Handle(FriendRequestAcceptedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.SenderUserId.ToString())
            .FriendRequestAccepted(new(notification), cancellationToken);
    }
}