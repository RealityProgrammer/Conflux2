using Conflux.Application.Features.Conversation;
using Conflux.Application.Features.Friends;
using Conflux.Domain.Dto;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Calling;

[Facet(typeof(IncomingCallNotification), Include = [
    nameof(IncomingCallNotification.CallId),
    nameof(IncomingCallNotification.CallerProfile),
])]
public sealed partial record IncomingCallEvent;

internal sealed class IncomingCallNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<IncomingCallNotification> {
    public async ValueTask Handle(IncomingCallNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.CalleeId.ToString())
            .IncomingDirectCall(new(notification), cancellationToken);
    }
}