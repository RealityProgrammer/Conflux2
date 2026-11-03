using Conflux.Application.Features.Servers;
using Conflux.Application.Services;
using Conflux.WebApi.Services;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerJoinedNotification), Include = [
    nameof(ServerJoinedNotification.ServerId)
])]
public sealed partial record JoinedServerEvent;

internal sealed class ServerJoinedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IConnectionTracker connectionTracker
) : INotificationHandler<ServerJoinedNotification> {
    public async ValueTask Handle(ServerJoinedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.UserId.ToString())
            .JoinedServer(new(notification), cancellationToken);
        
        // register all connections of this user to join the server group
        var groupName = SignalRGroupNameProvider.GetServerGroupName(notification.ServerId);
        
        foreach (var connectionId in await connectionTracker.GetConnections(notification.UserId)) {
            await hubContext
                .Groups
                .AddToGroupAsync(connectionId, groupName, cancellationToken);
        }
    }
}