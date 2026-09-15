namespace Conflux.Domain.Enums;

public enum ServerPermission {
    CreateRole,
    UpdateRole,
    DeleteRole,
    
    CreateChannel,
    DeleteChannel,
    
    UpdateMemberRoles,
    ManageMembers,
    KickMembers,
    WarnMembers,
    BanMembers,
    UnbanMembers,
    
    ReadModerationLogs,
}