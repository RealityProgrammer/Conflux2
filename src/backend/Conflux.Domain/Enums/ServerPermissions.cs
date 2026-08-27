namespace Conflux.Domain.Enums;

[Flags]
public enum ServerPermissions {
    None = 0,
    
    CreateRole = 1 << 0,
    DeleteRole = 1 << 1,
    
    CreateChannel = 1 << 2,
    DeleteChannel = 1 << 3,
}