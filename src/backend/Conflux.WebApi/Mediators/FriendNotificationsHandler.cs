using Conflux.Application.Dto.Notifications;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Mediators;

public sealed class FriendNotificationsHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<FriendRequestSentNotification>, 
    INotificationHandler<FriendRequestCanceledNotification>,
    INotificationHandler<FriendRequestAcceptedNotification>,
    INotificationHandler<FriendRequestRejectedNotification>,
    INotificationHandler<UnfriendNotification>
{
    public async ValueTask Handle(FriendRequestSentNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.ReceiverUserId.ToString()).FriendRequestRejected(
            new(notification.SenderUserId),
            cancellationToken
        );
    }

    public async ValueTask Handle(FriendRequestCanceledNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.ReceiverUserId.ToString()).FriendRequestCanceled(
            new(notification.SenderUserId),
            cancellationToken: cancellationToken
        );
    }

    public async ValueTask Handle(FriendRequestAcceptedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.SenderUserId.ToString()).FriendRequestAccepted(
            new(notification.AcceptorUserId),
            cancellationToken: cancellationToken
        );
    }

    public async ValueTask Handle(FriendRequestRejectedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.SenderUserId.ToString()).FriendRequestRejected(
            new(notification.RejecterUserId),
            cancellationToken: cancellationToken
        );
    }
    
    public async ValueTask Handle(UnfriendNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.OtherUserId.ToString()).Unfriended(
            new(notification.InvokerUserId),
            cancellationToken: cancellationToken
        );
    }
}