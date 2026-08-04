using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.SignalR;

[Authorize]
public sealed class GatewayHub : Hub<IConfluxClient> {
    public async Task JoinChannel(Guid channelId) {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"channel:{channelId}");
    }

    public async Task LeaveChannel(Guid channelId) {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"channel:{channelId}");
    }
}