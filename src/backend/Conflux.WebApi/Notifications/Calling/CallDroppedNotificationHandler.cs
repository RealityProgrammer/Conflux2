using Conflux.Application.Features.Conversation;
using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Calling;

public sealed record DirectCallDroppedEvent(Guid DroppedUserId);

internal sealed class CallDroppedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<CallDroppedNotification> {
    public async ValueTask Handle(CallDroppedNotification notification, CancellationToken cancellationToken) {
        // await hubContext.Clients
        //     .User(notification.PeerId.ToString())
        //     .DirectCallDropped(new(notification.DropperId), cancellationToken);
    }
}