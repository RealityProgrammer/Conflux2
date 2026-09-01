using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.NotificationHandlers;

public class FriendRequestSentNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<FriendRequestReceivedNotification> {
    public async ValueTask Handle(FriendRequestReceivedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.ReceiverUserId.ToString()).FriendRequestReceived(
            new(notification.SenderUserId),
            cancellationToken
        );
    }
}