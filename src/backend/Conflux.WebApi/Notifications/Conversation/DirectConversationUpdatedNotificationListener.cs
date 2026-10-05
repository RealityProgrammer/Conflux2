using Conflux.Application.Features.Conversation;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Conversation;

[Facet(typeof(DirectConversationUpdatedNotification), Include = [nameof(DirectConversationUpdatedNotification.ConversationId)])]
public sealed partial record DirectConversationUpdatedEvent;

public sealed class DirectConversationUpdatedNotificationListener(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<DirectConversationUpdatedNotification> {
    public async ValueTask Handle(DirectConversationUpdatedNotification notification, CancellationToken cancellationToken) {
        DirectConversationUpdatedEvent @event = new(notification);
        
        foreach (var userId in notification.ParticipantUserIds) {
            string userGroupName = NameProvider.GetUserGroupName(userId);

            await hubContext.Clients
                .Group(userGroupName)
                .DirectConversationUpdated(@event, cancellationToken);
        }
    }
}