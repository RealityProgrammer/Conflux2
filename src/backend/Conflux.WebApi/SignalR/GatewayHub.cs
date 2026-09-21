using Conflux.Application.Services;
using Conflux.Domain.Enums;
using Conflux.WebApi.Dto;
using Conflux.WebApi.Services;
using Conflux.WebApi.Services.Implementations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.SignalR;

[Authorize]
public sealed class GatewayHub(
    JoinTracker joinTracker,
    SignalRConnectionTracker connectionTracker,
    IServerPermissionsProvider serverPermissionsProvider,
    ITypingIndicatorService typingIndicatorService,
    IPresenceService presenceService,
    ILogger<GatewayHub> logger
) : Hub<IConfluxClient> {
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

    // invoked by the frontend only
    public async Task JoinServer(Guid serverId) {
        await InternalLeaveServer(serverId);
        
        string connectionId = Context.ConnectionId;
        List<string> joinedGroups = [];

        // the base group (or global group, whatever you prefer)
        string baseGroup = NameProvider.GetServerGroupName(serverId);
        await Groups.AddToGroupAsync(connectionId, baseGroup);
        joinedGroups.Add(baseGroup);
        
        await joinTracker.IncrementServerJoinCount(connectionId, serverId);
        
        // join groups specify by read/write boundary of server permissions.
        string? userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userIdGuid)) {
            return;
        }

        var getMemberAuthorizeInfo = 
            await serverPermissionsProvider.GetUserAuthorizeInfo(serverId, userIdGuid, Context.ConnectionAborted);

        if (!getMemberAuthorizeInfo.IsSuccess) {
            return;
        }

        var effectivePermissions = getMemberAuthorizeInfo.Value!.EffectivePermissions;

        if (effectivePermissions.Contains(ServerPermission.ManageMembers)) {
            string group = NameProvider.GetServerPermissionGroupName(serverId, ServerPermission.ManageMembers);
            await Groups.AddToGroupAsync(connectionId, group);
            joinedGroups.Add(group);
        }
        
        if (effectivePermissions.Contains(ServerPermission.ReadModerationLogs)) {
            string group = NameProvider.GetServerPermissionGroupName(serverId, ServerPermission.ReadModerationLogs);
            await Groups.AddToGroupAsync(connectionId, group);
            joinedGroups.Add(group);
        }
        
        // allow role viewing when there are either CreateRole or UpdateRole
        if (effectivePermissions.Contains(ServerPermission.CreateRole) || effectivePermissions.Contains(ServerPermission.UpdateRole)) {
            string group = NameProvider.GetServerViewRolePermissionGroupName(serverId);
            await Groups.AddToGroupAsync(connectionId, group);
            joinedGroups.Add(group);
        }

        Context.Items[$"server_groups:{serverId}"] = joinedGroups;
    }

    // invoked by the frontend only
    public async Task LeaveServer(Guid serverId) {
        await InternalLeaveServer(serverId);
    }
    
    private async Task InternalLeaveServer(Guid serverId) {
        string connectionId = Context.ConnectionId;
        string itemKey = $"server_groups:{serverId}";

        if (Context.Items.TryGetValue(itemKey, out var obj) && obj is List<string> joinedGroups) {
            foreach (var groupName in joinedGroups) {
                await Groups.RemoveFromGroupAsync(connectionId, groupName);
            }
            
            Context.Items.Remove(itemKey);
        } else {
            // fallback just in case
            await Groups.RemoveFromGroupAsync(connectionId, NameProvider.GetServerGroupName(serverId));
        }

        await joinTracker.DecrementServerJoinCount(connectionId, serverId);
    }
    
    // invoked by the frontend only
    public async Task NotifyTyping(string channelId) {
        if (!Guid.TryParse(channelId, out var channelIdGuid)) return;
        
        var userId = Context.UserIdentifier;
        if (userId == null) return;

        TypingUserDto? dto = await typingIndicatorService.GetTypingUserAsync(userId);
        if (dto == null) return;
        
        await Clients
            .OthersInGroup(NameProvider.GetChannelGroupName(channelIdGuid))
            .UserTyping(new(dto.UserId, dto.DisplayName, dto.HasAvatar), Context.ConnectionAborted);
    }
    
    // invoked by the frontend only
    public async Task Heartbeat() {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
    
        if (!string.IsNullOrEmpty(idClaim) && Guid.TryParse(idClaim, out var userId)) {
            logger.LogDebug("User {id} invokes Heartbeat", userId);
            await connectionTracker.Heartbeat(userId, Context.ConnectionId);
        }
    }
    
    // invoked by the frontend only
    public async Task SetAutoIdle(bool idle) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
    
        if (!string.IsNullOrEmpty(idClaim) && Guid.TryParse(idClaim, out var userId)) {
            logger.LogDebug("User {id} invokes SetAutoIdle({v})", userId, idle);
        }
    }

    public override async Task OnConnectedAsync() {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (!string.IsNullOrEmpty(idClaim) && Guid.TryParse(idClaim, out var userId)) {
            bool isFirstConnection = await connectionTracker.TrackConnection(userId, Context.ConnectionId);
            
            if (isFirstConnection) {
                await presenceService.UserConnected(userId);
            }
        }
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception) {
        await joinTracker.DeleteAllJoinCounts(Context.ConnectionId);
        
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (!string.IsNullOrEmpty(idClaim) && Guid.TryParse(idClaim, out var userId)) {
            bool isLastConnection = await connectionTracker.UntrackConnection(userId, Context.ConnectionId);

            if (isLastConnection) {
                await presenceService.UserDisconnected(userId);
            }
        }
        
        await base.OnDisconnectedAsync(exception);
    }
}