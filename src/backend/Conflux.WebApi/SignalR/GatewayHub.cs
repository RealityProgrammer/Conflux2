using Conflux.Application.Features.Conversation;
using Conflux.Application.Features.Friends;
using Conflux.Application.Services;
using Conflux.Domain.Repositories;
using Conflux.WebApi.Services;
using Conflux.WebApi.Services.Implementations;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.SignalR;

[Authorize]
public sealed partial class GatewayHub(
    JoinTracker joinTracker,
    SignalRConnectionTracker connectionTracker,
    IServerPermissionsProvider serverPermissionsProvider,
    ITypingIndicatorService typingIndicatorService,
    IPresenceService presenceService,
    ILogger<GatewayHub> logger,
    ISender sender
) : Hub<IConfluxClient> {
    public override async Task OnConnectedAsync() {
        if (!Guid.TryParse(Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId)) {
            await base.OnConnectedAsync();
            return;
        }
        
        await Groups.AddToGroupAsync(Context.ConnectionId, NameProvider.GetUserGroupName(userId));
        
        bool isFirstConnection = await connectionTracker.TrackConnection(userId, Context.ConnectionId);
        
        if (isFirstConnection) {
            await presenceService.UserConnected(userId);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception) {
        await joinTracker.DeleteAllJoinCounts(Context.ConnectionId);
        
        if (!Guid.TryParse(Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId)) {
            await base.OnDisconnectedAsync(exception);
            return;
        }
        
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, NameProvider.GetUserGroupName(userId));
        
        bool isLastConnection = await connectionTracker.UntrackConnection(userId, Context.ConnectionId);

        if (isLastConnection) {
            await presenceService.UserDisconnected(userId);
        }

        await sender.Send(new DropCallCommand(userId, Context.ConnectionId, isLastConnection));

        await base.OnDisconnectedAsync(exception);
    }
}