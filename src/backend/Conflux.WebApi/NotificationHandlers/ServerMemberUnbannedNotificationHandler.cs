using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.NotificationHandlers;

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
        
        await hubContext.Clients.GroupExcept($"server:{notification.ServerId}", excludedConnectionIds)
            .ServerMemberUnbanned(
                new(notification.ServerId, notification.UnbannedMemberUserId, notification.UnbannedMemberId), 
                cancellationToken
            );
    }
}