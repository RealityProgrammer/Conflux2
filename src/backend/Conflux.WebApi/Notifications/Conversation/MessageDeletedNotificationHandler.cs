using Conflux.Application.Features.Conversation;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Conversation;

[Facet(typeof(MessageDeletedNotification), Include = [nameof(MessageDeletedNotification.MessageId)])]
public sealed partial record MessageDeletedEvent;

internal sealed class DeletedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<MessageDeletedNotification> {
    public async ValueTask Handle(MessageDeletedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        string groupName = SignalRGroupNameProvider.GetConversationGroupName(notification.ConversationId);
        
        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);
        
        await target.MessageDeleted(new(notification), cancellationToken);
    }
}