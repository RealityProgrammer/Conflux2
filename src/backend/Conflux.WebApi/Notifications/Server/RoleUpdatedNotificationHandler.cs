using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerRoleUpdatedNotification), Include = [
    nameof(ServerRoleUpdatedNotification.ServerId),
    nameof(ServerRoleUpdatedNotification.RoleId),
])]
public sealed partial record ServerRoleUpdatedEvent;

[Facet(typeof(ServerDefaultRoleUpdatedNotification), Include = [
    nameof(ServerDefaultRoleUpdatedNotification.ServerId),
])]
public sealed partial record ServerDefaultRoleUpdatedEvent;

internal sealed class RoleUpdatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<ServerRoleUpdatedNotification>, INotificationHandler<ServerDefaultRoleUpdatedNotification> {
    public async ValueTask Handle(ServerRoleUpdatedNotification notification, CancellationToken cancellationToken) {
        // not filter connection id just in case some server-side computed field pop up.
        await hubContext.Clients
            .Group(SignalRGroupNameProvider.GetServerGroupName(notification.ServerId))
            .ServerRoleUpdated(new(notification), cancellationToken);
    }

    public async ValueTask Handle(ServerDefaultRoleUpdatedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .Group(SignalRGroupNameProvider.GetServerGroupName(notification.ServerId))
            .ServerDefaultRoleUpdated(new(notification), cancellationToken);
    }
}