using Conflux.Application.Features.Conversation;
using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Calling;

public sealed record DirectCallEndedEvent(Guid EnderUserId);

internal sealed class CallEndedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<CallEndedNotification> {
    public async ValueTask Handle(CallEndedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.PeerId.ToString())
            .DirectCallEnded(new(notification.EnderId), cancellationToken);
    }
}