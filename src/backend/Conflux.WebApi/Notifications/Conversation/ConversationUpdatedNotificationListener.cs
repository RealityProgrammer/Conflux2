using Conflux.Application.Features.Conversation;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Conversation;

[Facet(typeof(ConversationUpdatedNotification), Include = [nameof(ConversationUpdatedNotification.ConversationId)])]
public sealed partial record ConversationUpdatedEvent;

public sealed class ConversationUpdatedNotificationListener(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<ConversationUpdatedNotification> {
    public async ValueTask Handle(ConversationUpdatedNotification notification, CancellationToken cancellationToken) {
        ConversationUpdatedEvent @event = new(notification);
        
        foreach (var userId in notification.ParticipantUserIds) {
            string userGroupName = NameProvider.GetUserGroupName(userId);

            await hubContext.Clients
                .Group(userGroupName)
                .ConversationUpdated(@event, cancellationToken);
        }
    }
}