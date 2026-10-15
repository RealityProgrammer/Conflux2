using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerCreatedNotification), Include = [
    nameof(ServerCreatedNotification.ServerId)
])]
public sealed partial record CreatedServerEvent;

internal sealed class ServerCreatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<ServerCreatedNotification> {
    public async ValueTask Handle(ServerCreatedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.CreatorUserId.ToString())
            .CreatedServer(new(notification), cancellationToken);
    }
}