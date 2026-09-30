namespace Conflux.WebApi.SignalR;

partial class GatewayHub {
    // invoked by the frontend only
    public async Task JoinChannel(Guid channelId) {
        string connectionId = Context.ConnectionId;
        
        await Groups.AddToGroupAsync(connectionId, NameProvider.GetChannelGroupName(channelId));
        await joinTracker.IncrementChannelJoinCount(connectionId, channelId);
    }

    // invoked by the frontend only
    public async Task LeaveChannel(Guid channelId) {
        string connectionId = Context.ConnectionId;
        
        await Groups.RemoveFromGroupAsync(connectionId, NameProvider.GetChannelGroupName(channelId));
        await joinTracker.DecrementChannelJoinCount(connectionId, channelId);
    }
}