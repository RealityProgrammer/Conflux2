using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(ServerRoleDeletedNotification), Include = [
    nameof(ServerRoleDeletedNotification.ServerId),
    nameof(ServerRoleDeletedNotification.RoleId),
])]
public sealed partial record ServerRoleDeletedEvent;

internal sealed class ServerRoleDeletedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerRoleDeletedNotification> {
    public async ValueTask Handle(ServerRoleDeletedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group($"server:{notification.ServerId}")
            : hubContext.Clients.GroupExcept($"server:{notification.ServerId}", connectionId);

        await target.ServerRoleDeleted(new(notification), cancellationToken);
    }
}