using Conflux.Application.Features.Messages;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(UpdateDmConversationListNotification), Include = [
    nameof(UpdateDmConversationListNotification.ChannelId)
])]
public sealed partial record UpdateDmConversationListEvent;

public sealed class UpdateDmConversationListNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<UpdateDmConversationListNotification>
{
    public async ValueTask Handle(UpdateDmConversationListNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.SenderUserId.ToString())
            .UpdateDmConversationList(new(notification), cancellationToken);

        await hubContext.Clients.User(notification.ReceiverUserId.ToString())
            .UpdateDmConversationList(new(notification), cancellationToken);
    }
}