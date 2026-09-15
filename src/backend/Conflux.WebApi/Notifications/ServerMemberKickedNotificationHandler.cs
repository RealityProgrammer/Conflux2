using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(ServerMemberKickedNotification), Include = [
    nameof(ServerMemberKickedNotification.ServerId),
    nameof(ServerMemberKickedNotification.KickedMemberUserId),
    nameof(ServerMemberKickedNotification.KickedMemberId),
])]
public sealed partial record ServerMemberKickedEvent;

internal sealed class ServerMemberKickedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor,
    UserConnectionTracker connectionTracker
) : INotificationHandler<ServerMemberKickedNotification> {
    public async ValueTask Handle(ServerMemberKickedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.KickedMemberUserId.ToString()).KickedFromServer(notification.ServerId, cancellationToken);

        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        List<string> excludedConnectionIds = await connectionTracker.GetConnectionsAsync(notification.KickedMemberUserId);

        if (connectionId != null) {
            excludedConnectionIds.Add(connectionId);
        }
        
        await hubContext.Clients
            .GroupExcept($"server:{notification.ServerId}", excludedConnectionIds)
            .ServerMemberKicked(new(notification), cancellationToken);
        
        // TODO: Remove user from group to prevent receiving things like messages, etc...
    }
}