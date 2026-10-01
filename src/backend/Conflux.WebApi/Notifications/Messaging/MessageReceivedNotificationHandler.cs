using Conflux.Application.Features.Messages;
using Conflux.Domain.Dto;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Messaging;

[Facet(typeof(MessageReceivedNotification), Include = [nameof(MessageReceivedNotification.Message)])]
public sealed partial record MessageReceivedEvent;

internal sealed class MessageReceivedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<MessageReceivedNotification> {
    public async ValueTask Handle(MessageReceivedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        string groupName = NameProvider.GetConversationGroupName(notification.ConversationId);
        
        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);
        
        await target.MessageReceived(new(notification), cancellationToken);
    }
}