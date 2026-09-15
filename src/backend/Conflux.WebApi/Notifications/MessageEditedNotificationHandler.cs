using Conflux.Application.Features.Messages;
using Conflux.Domain.Dto;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(MessageEditedNotification), Include = [nameof(MessageEditedNotification.Message)])]
public sealed partial record MessageEditedEvent;

internal sealed class MessageEditedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<MessageEditedNotification> {
    public async ValueTask Handle(MessageEditedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        string groupName = NameProvider.GetChannelGroupName(notification.ChannelId);
        
        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);
        
        await target.MessageEdited(new(notification), cancellationToken);
    }
}