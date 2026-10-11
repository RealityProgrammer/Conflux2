using Conflux.Application.Features.Conversation;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Calling;

[Facet(typeof(CallDeniedNotification), Include = [
    nameof(CallDeniedNotification.CallId),
    nameof(CallDeniedNotification.CalleeId),
])]
public sealed partial record DirectCallDeniedEvent;

internal sealed class CallDeniedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<CallDeniedNotification> {
    public async ValueTask Handle(CallDeniedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.CallerId.ToString())
            .DirectCallDenied(new(notification), cancellationToken);
    }
}