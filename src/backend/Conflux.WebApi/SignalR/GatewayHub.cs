using Conflux.Application.Services;
using Conflux.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.SignalR;

[Authorize]
public sealed class GatewayHub(
    JoinTracker joinTracker,
    UserConnectionTracker connectionTracker,
    IServerPermissionsProvider serverPermissionsProvider
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
        string connectionId = Context.ConnectionId;
        List<string> joinedGroups = [];

        // the base group (or global group, whatever you prefer)
        string baseGroup = NameProvider.GetServerGroupName(serverId);
        await Groups.AddToGroupAsync(connectionId, baseGroup);
        joinedGroups.Add(baseGroup);
        
        await joinTracker.IncrementServerJoinCount(connectionId, serverId);
        
        // join groups specify by server permissions
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
        foreach ((var permission, bool isGranted) in effectivePermissions) {
            if (!isGranted) {
                continue;
            }

            string permissionGroup = NameProvider.GetServerPermissionGroupName(serverId, permission);
            await Groups.AddToGroupAsync(connectionId, permissionGroup);
            joinedGroups.Add(permissionGroup);
        }
        
        // join groups specify by read/write boundary of server permissions.
        
        // allow role viewing when there are either CreateRole or UpdateRole
        if (effectivePermissions.ContainsKey(ServerPermission.CreateRole) || effectivePermissions.ContainsKey(ServerPermission.UpdateRole)) {
            string group = NameProvider.GetServerViewRolePermissionGroupName(serverId);
            await Groups.AddToGroupAsync(connectionId, group);
            joinedGroups.Add(group);
        }

        Context.Items[$"server_groups:{serverId}"] = joinedGroups;
    }

    // invoked by the frontend only
    public async Task LeaveServer(Guid serverId) {
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