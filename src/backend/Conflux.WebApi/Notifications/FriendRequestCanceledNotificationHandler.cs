using Conflux.Application.Features.Friends;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

public sealed record FriendRequestCanceledEvent(Guid SenderUserId);

internal sealed class FriendRequestCanceledNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<FriendRequestCanceledNotification> {
    public async ValueTask Handle(FriendRequestCanceledNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.ReceiverUserId.ToString()).FriendRequestCanceled(
            new(notification.SenderUserId),
            cancellationToken: cancellationToken
        );
    }
}