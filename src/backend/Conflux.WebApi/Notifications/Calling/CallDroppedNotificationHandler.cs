using Conflux.Application.Features.Conversation;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Calling;

[Facet(typeof(CallDroppedNotification), Include = [
    nameof(CallDroppedNotification.CallId),
    nameof(CallDroppedNotification.DropperId),
])]
public sealed partial record DirectCallDroppedEvent;

internal sealed class CallDroppedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<CallDroppedNotification> {
    public async ValueTask Handle(CallDroppedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.PeerId.ToString())
            .DirectCallDropped(new(notification), cancellationToken);
    }
}