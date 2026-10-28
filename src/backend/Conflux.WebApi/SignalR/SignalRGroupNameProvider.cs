using Conflux.Domain.Enums;

namespace Conflux.WebApi.SignalR;

internal static class SignalRGroupNameProvider {
    public static string GetServerGroupName(Guid serverId) => $"server:{serverId:N}";
    
    public static string GetServerPermissionGroupName(Guid serverId, ServerPermission permission) => 
        $"server:{serverId:N}:perm:{permission}";
    
    public static string GetServerViewRolePermissionGroupName(Guid serverId) => 
        $"server:{serverId:N}:perm:ViewRole";
    
    public static string GetConversationGroupName(Guid conversationId) => $"conversation:{conversationId}";
}