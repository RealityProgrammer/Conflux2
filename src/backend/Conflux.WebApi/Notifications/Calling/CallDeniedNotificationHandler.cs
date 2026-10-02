using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Calling;

public sealed record DirectCallDeniedEvent(Guid CalleeUserId);

internal sealed class CallDeniedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<CallDeniedNotification> {
    public async ValueTask Handle(CallDeniedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.CallerId.ToString())
            .DirectCallDenied(new(notification.CalleeId), cancellationToken);
    }
}