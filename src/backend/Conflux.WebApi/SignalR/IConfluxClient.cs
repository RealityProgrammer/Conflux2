namespace Conflux.WebApi.SignalR;

public interface IConfluxClient {
    Task FriendRequestReceived(FriendRequestReceivedEvent data, CancellationToken cancellationToken = default);
    Task FriendRequestCanceled(FriendRequestCanceledEvent data, CancellationToken cancellationToken = default);
    Task FriendRequestAccepted(FriendRequestAcceptedEvent data, CancellationToken cancellationToken = default);
    Task FriendRequestRejected(FriendRequestRejectedEvent data, CancellationToken cancellationToken = default);
    Task Unfriended(UnfriendedEvent data, CancellationToken cancellationToken = default);
    
    Task MessageReceived(MessageReceivedEvent data, CancellationToken cancellationToken = default);
    Task MessageEdited(MessageEditedEvent data, CancellationToken cancellationToken = default);
    Task MessageDeleted(MessageDeletedEvent data, CancellationToken cancellationToken = default);
    
    Task UpdateDmConversationList(UpdateDmConversationListEvent data, CancellationToken cancellationToken = default);

    Task ServerRoleCreated(ServerRoleCreatedEvent data, CancellationToken cancellationToken = default);
    Task ServerRoleUpdated(ServerRoleUpdatedEvent data, CancellationToken cancellationToken = default);
    Task ServerRoleDeleted(ServerRoleDeletedEvent data, CancellationToken cancellationToken = default);
    
    Task ServerChannelCategoryCreated(ServerChannelCategoryCreatedEvent data, CancellationToken cancellationToken = default);
    Task ServerChannelCategoryDeleted(ServerChannelCategoryDeletedEvent data, CancellationToken cancellationToken = default);
    
    Task ServerChannelCreated(ServerChannelCreatedEvent data, CancellationToken cancellationToken = default);
    Task ServerChannelDeleted(ServerChannelDeletedEvent data, CancellationToken cancellationToken = default);
    
    Task MemberRolesUpdated(MemberRolesUpdatedEvent data, CancellationToken cancellationToken = default);
    
    Task KickedFromServer(Guid serverId, CancellationToken cancellationToken = default);
    Task BannedFromServer(Guid serverId, CancellationToken cancellationToken = default);
    
    Task ServerMemberKicked(ServerMemberKickedEvent data, CancellationToken cancellationToken = default);
    Task ServerMemberBanned(ServerMemberBannedEvent data, CancellationToken cancellationToken = default);
}