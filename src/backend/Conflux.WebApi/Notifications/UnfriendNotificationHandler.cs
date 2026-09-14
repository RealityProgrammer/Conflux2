using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

public sealed class UnfriendNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<UnfriendNotification> {
    public async ValueTask Handle(UnfriendNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.OtherUserId.ToString()).Unfriended(
            new(notification.InvokerUserId),
            cancellationToken: cancellationToken
        );
    }
}