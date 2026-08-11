using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.SignalR;

[Authorize]
public sealed class GatewayHub(
    ActiveChannelTracker channelTracker,
    ILogger<GatewayHub> logger
) : Hub<IConfluxClient> {
    public async Task JoinChannel(Guid channelId) {
        string connectionId = Context.ConnectionId;
        
        logger.LogInformation("Connect {connectionId} to channel {channelId}", connectionId, channelId);
        
        await Groups.AddToGroupAsync(connectionId, $"channel:{channelId}");
        await channelTracker.AddActiveChannel(connectionId, channelId.ToString());
    }

    public async Task LeaveChannel(Guid channelId) {
        string connectionId = Context.ConnectionId;
        
        logger.LogInformation("Remove {connectionId} from channel {channelId}", connectionId, channelId);
        
        await Groups.RemoveFromGroupAsync(connectionId, $"channel:{channelId}");
        await channelTracker.RemoveActiveChannel(connectionId, channelId.ToString());
    }
    
    public override async Task OnDisconnectedAsync(Exception? exception) {
        await channelTracker.DeleteAllActiveChannels(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}