using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

public sealed record ServerRoleUpdatedEvent(Guid ServerId, Guid RoleId);

internal sealed class ServerRoleUpdatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<ServerRoleUpdatedNotification> {
    public async ValueTask Handle(ServerRoleUpdatedNotification notification, CancellationToken cancellationToken) {
        var target = hubContext.Clients.Group($"server:{notification.ServerId}");

        await target.ServerRoleUpdated(new(notification.ServerId, notification.RoleId), cancellationToken);
    }
}