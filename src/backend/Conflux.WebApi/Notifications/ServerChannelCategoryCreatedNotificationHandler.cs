using Conflux.Application.Features.Servers;
using Conflux.Domain.Dto;
using Conflux.WebApi.SignalR;
using Facet;
using Facet.Extensions;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(ServerChannelCategoryCreatedNotification), Include = [
    nameof(ServerChannelCategoryCreatedNotification.ServerId),
    nameof(ServerChannelCategoryCreatedNotification.CategoryIdentity),
])]
public sealed partial record ServerChannelCategoryCreatedEvent;

internal sealed class ServerChannelCategoryCreatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerChannelCategoryCreatedNotification> {
    public async ValueTask Handle(
        ServerChannelCategoryCreatedNotification notification, 
        CancellationToken cancellationToken
    ) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group($"server:{notification.ServerId}")
            : hubContext.Clients.GroupExcept($"server:{notification.ServerId}", connectionId);

        await target.ServerChannelCategoryCreated(new(notification), cancellationToken);
    }
}