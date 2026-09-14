using Conflux.Application.Features.Messages;
using Conflux.Domain.Dto;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

public sealed record MessageEditedEvent(TimelineMessageDto Message);

internal sealed class MessageEditedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<MessageEditedNotification> {
    public async ValueTask Handle(MessageEditedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group($"channel:{notification.ChannelId}")
            : hubContext.Clients.GroupExcept($"channel:{notification.ChannelId}", connectionId);
        
        await target.MessageEdited(new(notification.Message), cancellationToken);
    }
}