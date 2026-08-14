using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.SignalR;

[Authorize]
public sealed class GatewayHub(
    ActiveChannelTracker channelTracker
) : Hub<IConfluxClient> {
    public async Task JoinChannel(Guid channelId) {
        string connectionId = Context.ConnectionId;
        
        await Groups.AddToGroupAsync(connectionId, $"channel:{channelId}");
        await channelTracker.AddActiveChannel(connectionId, channelId.ToString());
    }

    public async Task LeaveChannel(Guid channelId) {
        string connectionId = Context.ConnectionId;
        
        await Groups.RemoveFromGroupAsync(connectionId, $"channel:{channelId}");
        await channelTracker.RemoveActiveChannel(connectionId, channelId.ToString());
    }
    
    public override async Task OnDisconnectedAsync(Exception? exception) {
        await channelTracker.DeleteAllActiveChannels(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}