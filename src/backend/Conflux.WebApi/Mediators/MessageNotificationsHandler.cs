using Conflux.Application.Dto.Notifications;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Mediators;

public sealed class MessageNotificationsHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor,
    ILogger<MessageNotificationsHandler> logger
) : INotificationHandler<MessageReceivedNotification>
{
    public async ValueTask Handle(MessageReceivedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group($"channel:{notification.ChannelId}")
            : hubContext.Clients.GroupExcept($"channel:{notification.ChannelId}", connectionId);
        
        await target.MessageReceived(new(notification.Message), cancellationToken);
    }
}