using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerRoleDeletedNotification), Include = [
    nameof(ServerRoleDeletedNotification.ServerId),
    nameof(ServerRoleDeletedNotification.RoleId),
])]
public sealed partial record ServerRoleDeletedEvent;

internal sealed class RoleDeletedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerRoleDeletedNotification> {
    public async ValueTask Handle(ServerRoleDeletedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        string groupName = NameProvider.GetServerGroupName(notification.ServerId);

        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);

        await target.ServerRoleDeleted(new(notification), cancellationToken);
    }
}