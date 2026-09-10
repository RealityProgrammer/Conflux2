using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.SignalR;

[Authorize]
public sealed class GatewayHub(
    JoinTracker joinTracker,
    UserConnectionTracker connectionTracker
) : Hub<IConfluxClient> {
    public async Task JoinChannel(Guid channelId) {
        string connectionId = Context.ConnectionId;
        
        await Groups.AddToGroupAsync(connectionId, $"channel:{channelId}");
        await joinTracker.IncrementChannelJoinCount(connectionId, channelId);
    }

    public async Task LeaveChannel(Guid channelId) {
        string connectionId = Context.ConnectionId;
        
        await Groups.RemoveFromGroupAsync(connectionId, $"channel:{channelId}");
        await joinTracker.DecrementChannelJoinCount(connectionId, channelId);
    }

    public async Task JoinServer(Guid serverId) {
        string connectionId = Context.ConnectionId;
        
        await Groups.AddToGroupAsync(connectionId, $"server:{serverId}");
        await joinTracker.IncrementServerJoinCount(connectionId, serverId);
    }

    public async Task LeaveServer(Guid serverId) {
        string connectionId = Context.ConnectionId;
        
        await Groups.RemoveFromGroupAsync(connectionId, $"server:{serverId}");
        await joinTracker.DecrementServerJoinCount(connectionId, serverId);
    }

    public override async Task OnConnectedAsync() {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (!string.IsNullOrEmpty(idClaim) && Guid.TryParse(idClaim, out var userId)) {
            await connectionTracker.AddConnectionAsync(userId, Context.ConnectionId);
        }
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception) {
        await joinTracker.DeleteAllJoinCounts(Context.ConnectionId);
        
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (!string.IsNullOrEmpty(idClaim) && Guid.TryParse(idClaim, out var userId)) {
            await connectionTracker.RemoveConnectionAsync(userId, Context.ConnectionId);
        }
        
        await base.OnDisconnectedAsync(exception);
    }
}