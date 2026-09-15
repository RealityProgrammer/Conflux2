using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(ServerChannelCategoryDeletedNotification), Include = [
    nameof(ServerChannelCategoryDeletedNotification.ServerId),
    nameof(ServerChannelCategoryDeletedNotification.CategoryId),
])]
public sealed partial record ServerChannelCategoryDeletedEvent;

internal sealed class ServerChannelCategoryDeletedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerChannelCategoryDeletedNotification> {
    public async ValueTask Handle(
        ServerChannelCategoryDeletedNotification notification, 
        CancellationToken cancellationToken
    ) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        string groupName = NameProvider.GetServerGroupName(notification.ServerId);

        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);

        await target.ServerChannelCategoryDeleted(new(notification), cancellationToken);
    }
}