using Conflux.Application.Features.Servers;
using Conflux.Application.Services;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerMemberLeftNotification), exclude: [])]
public sealed partial record ServerMemberLeftEvent;

[Facet(typeof(ServerMemberLeftNotification), Include = [
    nameof(ServerMemberLeftNotification.ServerId),
])]
public sealed partial record LeftServerEvent;

internal sealed class ServerMemberLeftNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor,
    IConnectionTracker connectionTracker
) : INotificationHandler<ServerMemberLeftNotification> {
    public async ValueTask Handle(ServerMemberLeftNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        if (await connectionTracker.GetConnections(notification.MemberUserId) is { Count: > 0 } userConnections) {
            if (!string.IsNullOrEmpty(connectionId)) {
                userConnections.Remove(connectionId);
            }

            await hubContext.Clients.Clients(userConnections).LeftServer(new(notification.ServerId), cancellationToken);
        }

        if (connectionId != null) {
            await hubContext.Groups.RemoveFromGroupAsync(
                connectionId,
                SignalRGroupNameProvider.GetServerGroupName(notification.ServerId),
                cancellationToken
            );
        }
        
        var groupName = SignalRGroupNameProvider.GetServerGroupName(notification.ServerId);
        
        IConfluxClient target = string.IsNullOrEmpty(connectionId) ?
            hubContext.Clients.Group(groupName) :
            hubContext.Clients.GroupExcept(groupName, connectionId);

        await target.ServerMemberLeft(new(notification), cancellationToken);
    }
}