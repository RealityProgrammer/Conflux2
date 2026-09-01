using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.NotificationHandlers;

public class FriendRequestAcceptedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<FriendRequestAcceptedNotification> {
    public async ValueTask Handle(FriendRequestAcceptedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.SenderUserId.ToString()).FriendRequestAccepted(
            new(notification.AcceptorUserId),
            cancellationToken: cancellationToken
        );
    }
}