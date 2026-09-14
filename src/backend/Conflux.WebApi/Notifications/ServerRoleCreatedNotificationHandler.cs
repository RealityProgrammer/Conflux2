using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

public class ServerRoleCreatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerRoleCreatedNotification> {
    public async ValueTask Handle(ServerRoleCreatedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group($"server:{notification.ServerId}")
            : hubContext.Clients.GroupExcept($"server:{notification.ServerId}", connectionId);

        await target.ServerRoleCreated(new(notification.ServerId, notification.Role), cancellationToken);
    }
}