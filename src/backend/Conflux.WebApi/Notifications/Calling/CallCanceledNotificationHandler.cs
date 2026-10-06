using Conflux.Application.Features.Conversation;
using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Calling;

[Facet(typeof(DirectCallCanceledNotification), Include = [
    nameof(DirectCallCanceledNotification.CallId),
    nameof(DirectCallCanceledNotification.CallerId),
])]
public sealed partial record DirectCallCanceledEvent;

internal sealed class CallCanceledNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<DirectCallCanceledNotification> {
    public async ValueTask Handle(DirectCallCanceledNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.CalleeId.ToString())
            .DirectCallCanceled(new(notification), cancellationToken);
    }
}