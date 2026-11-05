using Conflux.Application.Features.Servers;
using Conflux.Application.Services;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(UserJoinedServerNotification), Include = [
    nameof(UserJoinedServerNotification.ServerId),
])]
public sealed partial record JoinedServerEvent;

[Facet(typeof(UserJoinedServerNotification), Include = [
    nameof(UserJoinedServerNotification.ServerId),
    nameof(UserJoinedServerNotification.MemberUserId),
    nameof(UserJoinedServerNotification.MemberId),
])]
public sealed partial record UserJoinedServerEvent;

internal sealed class UserJoinedServerNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IConnectionTracker connectionTracker
) : INotificationHandler<UserJoinedServerNotification> {
    public async ValueTask Handle(UserJoinedServerNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .User(notification.MemberUserId.ToString())
            .JoinedServer(new(notification), cancellationToken);
        
        var serverGroupName = SignalRGroupNameProvider.GetServerGroupName(notification.ServerId);

        await hubContext.Clients
            .Group(serverGroupName)
            .UserJoinedServer(new(notification), cancellationToken);

        // register all connections of this user to join the server group
        foreach (var connectionId in await connectionTracker.GetConnections(notification.MemberUserId)) {
            await hubContext
                .Groups
                .AddToGroupAsync(connectionId, serverGroupName, cancellationToken);
        }
    }
}
