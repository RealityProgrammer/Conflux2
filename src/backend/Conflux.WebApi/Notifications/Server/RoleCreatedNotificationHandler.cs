using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerRoleCreatedNotification), Include = [
    nameof(ServerRoleCreatedNotification.ServerId),
    nameof(ServerRoleCreatedNotification.Role),
])]
public sealed partial record ServerRoleCreatedEvent;

internal sealed class RoleCreatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerRoleCreatedNotification> {
    public async ValueTask Handle(ServerRoleCreatedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        string groupName = NameProvider.GetServerViewRolePermissionGroupName(notification.ServerId);

        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);

        await target.ServerRoleCreated(new(notification), cancellationToken);
    }
}