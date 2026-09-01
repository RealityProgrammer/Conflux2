using Conflux.Application.Features.Messages;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.NotificationHandlers;

public sealed class MessageDeletedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<MessageDeletedNotification> {
    public async ValueTask Handle(MessageDeletedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group($"channel:{notification.ChannelId}")
            : hubContext.Clients.GroupExcept($"channel:{notification.ChannelId}", connectionId);
        
        await target.MessageDeleted(new(notification.MessageId), cancellationToken);
    }
}