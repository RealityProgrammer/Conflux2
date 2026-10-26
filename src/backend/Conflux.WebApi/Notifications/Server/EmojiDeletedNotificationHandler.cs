using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(EmojiDeletedNotification), Include = [
    nameof(EmojiDeletedNotification.EmojiIds),
])]
public sealed partial record EmojiDeletedEvent;

internal sealed class EmojiDeletedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<EmojiDeletedNotification> {
    public async ValueTask Handle(EmojiDeletedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        string groupName = NameProvider.GetServerGroupName(notification.ServerId);
        
        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);

        await target.EmojiDeleted(new(notification), cancellationToken);
    }
}