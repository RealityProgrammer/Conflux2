using Conflux.Application.Features.Servers;
using Conflux.WebApi.Services;
using Conflux.WebApi.Services.Implementations;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Primitives;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerCreatedNotification), Include = [
    nameof(ServerCreatedNotification.ServerId),
])]
public sealed partial record CreatedServerEvent;

internal sealed class ServerCreatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    ISignalRConnectionTracker signalRConnectionTracker
) : INotificationHandler<ServerCreatedNotification> {
    public async ValueTask Handle(ServerCreatedNotification notification, CancellationToken cancellationToken) {
        // notify user (all other connections affect too)
        await hubContext.Clients
            .User(notification.CreatorUserId.ToString())
            .CreatedServer(new(notification), cancellationToken);
        
        // register all connections of this user to join the server group
        var groupName = SignalRGroupNameProvider.GetServerGroupName(notification.ServerId);
        
        foreach (var connectionId in await signalRConnectionTracker.GetConnections(notification.CreatorUserId)) {
            await hubContext
                .Groups
                .AddToGroupAsync(connectionId, groupName, cancellationToken);
        }
    }
}