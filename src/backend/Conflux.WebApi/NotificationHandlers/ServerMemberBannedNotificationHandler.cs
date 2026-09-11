using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.NotificationHandlers;

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
        
        await hubContext.Clients.GroupExcept($"server:{notification.ServerId}", excludedConnectionIds)
            .ServerMemberBanned(
                new(notification.ServerId, notification.BannedMemberUserId, notification.BannedMemberId), 
                cancellationToken
            );
    }
}