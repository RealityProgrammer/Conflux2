using Conflux.Application.Features.Messages;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.NotificationHandlers;

public sealed class UpdateDmConversationListNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<UpdateDmConversationListNotification>
{
    public async ValueTask Handle(UpdateDmConversationListNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.SenderUserId.ToString())
            .UpdateDmConversationList(new(notification.ChannelId, 0), cancellationToken);

        await hubContext.Clients.User(notification.ReceiverUserId.ToString())
            .UpdateDmConversationList(new(notification.ChannelId, 69), cancellationToken);
    }
}