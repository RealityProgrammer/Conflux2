using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerChannelDeletedNotification), Include = [
    nameof(ServerChannelDeletedNotification.ServerId),
    nameof(ServerChannelDeletedNotification.ChannelId),
])]
public sealed partial record ServerChannelDeletedEvent;

internal sealed class ChannelDeletedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerChannelDeletedNotification> {
    public async ValueTask Handle(
        ServerChannelDeletedNotification notification, 
        CancellationToken cancellationToken
    ) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        string groupName = NameProvider.GetServerGroupName(notification.ServerId);

        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);

        await target.ServerChannelDeleted(new(notification), cancellationToken);
    }
}