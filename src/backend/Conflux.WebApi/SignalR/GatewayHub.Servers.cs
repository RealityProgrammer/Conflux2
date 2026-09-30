using Conflux.Domain.Enums;

namespace Conflux.WebApi.SignalR;

partial class GatewayHub {
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
}