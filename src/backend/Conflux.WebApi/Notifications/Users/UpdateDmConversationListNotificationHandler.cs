using Conflux.Application.Features.Messages;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Users;

[Facet(typeof(UpdateDmConversationListNotification), Include = [
    nameof(UpdateDmConversationListNotification.ChannelId)
])]
public sealed partial record UpdateDmConversationListEvent;

public sealed class UpdateDmConversationListNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<UpdateDmConversationListNotification> {
    public async ValueTask Handle(UpdateDmConversationListNotification notification, CancellationToken cancellationToken) {
        UpdateDmConversationListEvent @event = new(notification);
        
        await hubContext.Clients.User(notification.SenderUserId.ToString())
            .UpdateDmConversationList(@event, cancellationToken);

        await hubContext.Clients.User(notification.ReceiverUserId.ToString())
            .UpdateDmConversationList(@event, cancellationToken);
    }
}