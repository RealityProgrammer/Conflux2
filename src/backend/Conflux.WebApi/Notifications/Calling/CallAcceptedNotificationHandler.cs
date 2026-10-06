using Conflux.Application.Features.Conversation;
using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Calling;

[Facet(typeof(CallAcceptedNotification), Include = [
    nameof(CallAcceptedNotification.CallId),
    nameof(CallAcceptedNotification.CalleeId),
])]
public sealed partial record DirectCallAcceptedEvent;

internal sealed class CallAcceptedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<CallAcceptedNotification> {
    public async ValueTask Handle(CallAcceptedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.CallerId.ToString())
            .DirectCallAccepted(new(notification), cancellationToken);
    }
}