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

internal sealed class RoleUpdatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<ServerRoleUpdatedNotification> {
    public async ValueTask Handle(ServerRoleUpdatedNotification notification, CancellationToken cancellationToken) {
        // not filter connection id just in case some server-side computed field pop up.
        await hubContext.Clients
            .Group(NameProvider.GetServerGroupName(notification.ServerId))
            .ServerRoleUpdated(new(notification), cancellationToken);
    }
}