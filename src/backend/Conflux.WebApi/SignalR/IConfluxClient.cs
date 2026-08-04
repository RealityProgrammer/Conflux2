namespace Conflux.WebApi.SignalR;

public interface IConfluxClient {
    Task FriendRequestReceived(FriendRequestReceivedEvent data, CancellationToken cancellationToken = default);
    Task FriendRequestCanceled(FriendRequestCanceledEvent data, CancellationToken cancellationToken = default);
    Task FriendRequestAccepted(FriendRequestAcceptedEvent data, CancellationToken cancellationToken = default);
    Task FriendRequestRejected(FriendRequestRejectedEvent data, CancellationToken cancellationToken = default);
    Task Unfriended(UnfriendedEvent data, CancellationToken cancellationToken = default);
    
    Task MessageReceived(MessageReceivedEvent data, CancellationToken cancellationToken = default);
}