using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Friend;

[Facet(typeof(UnfriendNotification), Include = [nameof(UnfriendNotification.InvokerUserId)])]
public sealed partial record UnfriendedEvent;

internal sealed class UnfriendNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<UnfriendNotification> {
    public async ValueTask Handle(UnfriendNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.OtherUserId.ToString())
            .Unfriended(new(notification), cancellationToken);
    }
}