namespace Conflux.WebApi.SignalR;

partial class GatewayHub {
    // invoked by the frontend only
    public async Task JoinConversation(Guid conversationId) {
        string connectionId = Context.ConnectionId;
        
        await Groups.AddToGroupAsync(connectionId, NameProvider.GetConversationGroupName(conversationId));
        await joinTracker.IncrementConversationJoinCount(connectionId, conversationId);
    }

    // invoked by the frontend only
    public async Task LeaveConversation(Guid conversationId) {
        string connectionId = Context.ConnectionId;
        
        await Groups.RemoveFromGroupAsync(connectionId, NameProvider.GetConversationGroupName(conversationId));
        await joinTracker.DecrementConversationJoinCount(connectionId, conversationId);
    }
}