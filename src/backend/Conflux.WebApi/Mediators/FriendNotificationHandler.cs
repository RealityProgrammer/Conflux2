using Conflux.Application.Dto.Notifications;
using Conflux.WebApi.Hubs;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Mediators;

public sealed class FriendNotificationHandler(
    IHubContext<UserLobbyHub> hubContext,
    ILogger<FriendNotificationHandler> logger
) : 
    INotificationHandler<FriendRequestSentNotification>, 
    INotificationHandler<FriendRequestCanceledNotification>,
    INotificationHandler<FriendRequestAcceptedNotification>,
    INotificationHandler<FriendRequestRejectedNotification>,
    INotificationHandler<UnfriendNotification>
{
    public async ValueTask Handle(FriendRequestSentNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.ReceiverUserId.ToString()).SendAsync(
            "FriendRequestReceived",
            new { notification.SenderUserId },
            cancellationToken: cancellationToken
        );
    }

    public async ValueTask Handle(FriendRequestCanceledNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.ReceiverUserId.ToString()).SendAsync(
            "FriendRequestCanceled",
            new { notification.SenderUserId },
            cancellationToken: cancellationToken
        );
    }

    public async ValueTask Handle(FriendRequestAcceptedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.SenderUserId.ToString()).SendAsync(
            "FriendRequestAccepted",
            new { notification.AcceptorUserId },
            cancellationToken: cancellationToken
        );
    }

    public async ValueTask Handle(FriendRequestRejectedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.SenderUserId.ToString()).SendAsync(
            "FriendRequestRejected",
            new { notification.RejecterUserId },
            cancellationToken: cancellationToken
        );
    }
    
    public async ValueTask Handle(UnfriendNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.OtherUserId.ToString()).SendAsync(
            "Unfriended",
            new { notification.InvokerUserId },
            cancellationToken: cancellationToken
        );
    }
}