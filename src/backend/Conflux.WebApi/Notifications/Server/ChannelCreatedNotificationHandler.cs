using Conflux.Application.Features.Servers;
using Conflux.Domain.Dto;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerChannelCreatedNotification), Include = [
    nameof(ServerChannelCreatedNotification.ServerId),
    nameof(ServerChannelCreatedNotification.Channel),
])]
public sealed partial record ServerChannelCreatedEvent;

internal sealed class ChannelCreatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerChannelCreatedNotification> {
    public async ValueTask Handle(
        ServerChannelCreatedNotification notification, 
        CancellationToken cancellationToken
    ) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        string groupName = NameProvider.GetServerGroupName(notification.ServerId);

        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);

        await target.ServerChannelCreated(new(notification), cancellationToken);
    }
}