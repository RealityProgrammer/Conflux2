using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Calling;

public sealed record DirectCallCanceledEvent(Guid CallerUserId);

internal sealed class CallCanceledNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<CallCanceledNotification> {
    public async ValueTask Handle(CallCanceledNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.CalleeId.ToString())
            .DirectCallCanceled(new(notification.CallerId), cancellationToken);
    }
}