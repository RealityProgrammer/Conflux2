using Conflux.Application.Features.Servers;
using Conflux.Application.Services;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(EmojiCreatedNotification), Include = [
    nameof(EmojiCreatedNotification.ServerId),
    nameof(EmojiCreatedNotification.Emoji),
])]
public sealed partial record EmojiCreatedEvent;

internal sealed class EmojiCreatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<EmojiCreatedNotification> {
    public async ValueTask Handle(EmojiCreatedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        string groupName = NameProvider.GetServerGroupName(notification.Emoji.ServerId);
        
        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);

        await target.EmojiCreated(new(notification), cancellationToken);
    }
}