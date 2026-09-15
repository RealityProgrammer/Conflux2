using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(ServerMemberBannedNotification), Include = [
    nameof(ServerMemberBannedNotification.ServerId),
    nameof(ServerMemberBannedNotification.BannedMemberUserId),
    nameof(ServerMemberBannedNotification.BannedMemberId),
])]
public sealed partial record ServerMemberBannedEvent;

internal sealed class ServerMemberBannedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor,
    UserConnectionTracker connectionTracker
) : INotificationHandler<ServerMemberBannedNotification> {
    public async ValueTask Handle(ServerMemberBannedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.BannedMemberUserId.ToString()).BannedFromServer(notification.ServerId, cancellationToken);

        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        List<string> excludedConnectionIds = await connectionTracker.GetConnectionsAsync(notification.BannedMemberUserId);

        if (connectionId != null) {
            excludedConnectionIds.Add(connectionId);
        }
        
        await hubContext.Clients
            .GroupExcept(NameProvider.GetServerGroupName(notification.ServerId), excludedConnectionIds)
            .ServerMemberBanned(new(notification), cancellationToken);
    }
}