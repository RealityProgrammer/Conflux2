using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(ServerRoleUpdatedNotification), Include = [
    nameof(ServerRoleUpdatedNotification.ServerId),
    nameof(ServerRoleUpdatedNotification.RoleId),
])]
public sealed partial record ServerRoleUpdatedEvent;

internal sealed class ServerRoleUpdatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<ServerRoleUpdatedNotification> {
    public async ValueTask Handle(ServerRoleUpdatedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .Group($"server:{notification.ServerId}")
            .ServerRoleUpdated(new(notification), cancellationToken);
    }
}