using Conflux.Application.Features.Servers;
using Conflux.Application.Services;
using Conflux.WebApi.Services;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(MemberJoinedServerNotification), Include = [
    nameof(MemberJoinedServerNotification.ServerId),
])]
public sealed partial record JoinedServerEvent;

internal sealed class MemberJoinedServerNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IConnectionTracker connectionTracker
) : INotificationHandler<MemberJoinedServerNotification> {
    public async ValueTask Handle(MemberJoinedServerNotification notification, CancellationToken cancellationToken) {
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