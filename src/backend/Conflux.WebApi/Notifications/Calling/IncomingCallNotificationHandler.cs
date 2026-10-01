using Conflux.Application.Features.Friends;
using Conflux.Domain.Dto;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Calling;

public sealed record IncomingCallEvent(UserIdentityProfileDto CallerProfile);

internal sealed class IncomingCallNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<IncomingCallNotification> {
    public async ValueTask Handle(IncomingCallNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.CalleeId.ToString())
            .IncomingDirectCall(new(notification.CallerProfile), cancellationToken);
    }
}