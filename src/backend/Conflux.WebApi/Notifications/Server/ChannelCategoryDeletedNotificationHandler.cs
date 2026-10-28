using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerChannelCategoryDeletedNotification), Include = [
    nameof(ServerChannelCategoryDeletedNotification.ServerId),
    nameof(ServerChannelCategoryDeletedNotification.CategoryId),
])]
public sealed partial record ServerChannelCategoryDeletedEvent;

internal sealed class ChannelCategoryDeletedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<ServerChannelCategoryDeletedNotification> {
    public async ValueTask Handle(
        ServerChannelCategoryDeletedNotification notification, 
        CancellationToken cancellationToken
    ) {
        string groupName = SignalRGroupNameProvider.GetServerGroupName(notification.ServerId);

        await hubContext
            .Clients
            .Group(groupName)
            .ServerChannelCategoryDeleted(new(notification), cancellationToken);
    }
}