using Conflux.Application.Features.Messages;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

public sealed class MessageReceivedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<MessageReceivedNotification> {
    public async ValueTask Handle(MessageReceivedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        IConfluxClient target;
        
        if (string.IsNullOrEmpty(connectionId)) {
            target = hubContext.Clients.Group($"channel:{notification.ChannelId}");
        } else {
            target = hubContext.Clients.GroupExcept($"channel:{notification.ChannelId}", connectionId);
        }
        
        await target.MessageReceived(new(notification.Message), cancellationToken);
    }
}