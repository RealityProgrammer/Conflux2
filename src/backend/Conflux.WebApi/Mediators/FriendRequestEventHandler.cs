using Conflux.Application.Dto.Events;
using Conflux.WebApi.Hubs;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Mediators;

public sealed class FriendRequestEventHandler(
    IHubContext<UserLobbyHub> hubContext,
    ILogger<FriendRequestEventHandler> logger
) : INotificationHandler<FriendRequestSentEvent>, INotificationHandler<FriendRequestAcceptedEvent> {
    public async ValueTask Handle(FriendRequestSentEvent notification, CancellationToken cancellationToken) {
        logger.LogInformation("User {f} sent friend request to user {t}.", notification.SenderUserId, notification.ReceiverUserId);
        
        await hubContext.Clients.User(notification.ReceiverUserId.ToString()).SendAsync(
            "ReceivedFriendRequest", 
            cancellationToken: cancellationToken
        );
    }

    public async ValueTask Handle(FriendRequestAcceptedEvent notification, CancellationToken cancellationToken) {
        logger.LogInformation("User {f} accepted friend request of user {t}.", notification.AcceptorUserId, notification.RequesterUserId);
        
        await hubContext.Clients.User(notification.RequesterUserId.ToString()).SendAsync(
            "FriendRequestAccepted", 
            cancellationToken: cancellationToken
        );
    }
}