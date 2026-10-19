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
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<ServerChannelDeletedNotification> {
    public async ValueTask Handle(
        ServerChannelDeletedNotification notification, 
        CancellationToken cancellationToken
    ) {
        string groupName = NameProvider.GetServerGroupName(notification.ServerId);

        await hubContext
            .Clients
            .Group(groupName)
            .ServerChannelDeleted(new(notification), cancellationToken);
    }
}