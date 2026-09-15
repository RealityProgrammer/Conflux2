using Conflux.Application.Features.Servers;
using Conflux.Domain.Dto;
using Conflux.WebApi.SignalR;
using Facet;
using Facet.Extensions;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerChannelCategoryCreatedNotification), Include = [
    nameof(ServerChannelCategoryCreatedNotification.ServerId),
    nameof(ServerChannelCategoryCreatedNotification.CategoryIdentity),
])]
public sealed partial record ServerChannelCategoryCreatedEvent;

internal sealed class ChannelCategoryCreatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerChannelCategoryCreatedNotification> {
    public async ValueTask Handle(
        ServerChannelCategoryCreatedNotification notification, 
        CancellationToken cancellationToken
    ) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        string groupName = NameProvider.GetServerGroupName(notification.ServerId);

        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);

        await target.ServerChannelCategoryCreated(new(notification), cancellationToken);
    }
}