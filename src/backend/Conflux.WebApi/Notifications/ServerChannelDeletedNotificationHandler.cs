using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(ServerChannelDeletedNotification), Include = [
    nameof(ServerChannelDeletedNotification.ServerId),
    nameof(ServerChannelDeletedNotification.ChannelId),
])]
public sealed partial record ServerChannelDeletedEvent;

internal sealed class ServerChannelDeletedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerChannelDeletedNotification> {
    public async ValueTask Handle(
        ServerChannelDeletedNotification notification, 
        CancellationToken cancellationToken
    ) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group($"server:{notification.ServerId}")
            : hubContext.Clients.GroupExcept($"server:{notification.ServerId}", connectionId);

        await target.ServerChannelDeleted(new(notification), cancellationToken);
    }
}