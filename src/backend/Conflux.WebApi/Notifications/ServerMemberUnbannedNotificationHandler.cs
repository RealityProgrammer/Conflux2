using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(ServerMemberUnbannedNotification), Include = [
    nameof(ServerMemberUnbannedNotification.ServerId),
    nameof(ServerMemberUnbannedNotification.UnbannedMemberUserId),
    nameof(ServerMemberUnbannedNotification.UnbannedMemberId),
])]
public sealed partial record ServerMemberUnbannedEvent;

internal sealed class ServerMemberUnbannedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor,
    UserConnectionTracker connectionTracker
) : INotificationHandler<ServerMemberUnbannedNotification> {
    public async ValueTask Handle(ServerMemberUnbannedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.UnbannedMemberUserId.ToString()).UnbannedFromServer(notification.ServerId, cancellationToken);

        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        List<string> excludedConnectionIds = await connectionTracker.GetConnectionsAsync(notification.UnbannedMemberUserId);

        if (connectionId != null) {
            excludedConnectionIds.Add(connectionId);
        }
        
        await hubContext.Clients
            .GroupExcept(NameProvider.GetServerGroupName(notification.ServerId), excludedConnectionIds)
            .ServerMemberUnbanned(new(notification), cancellationToken);
    }
}