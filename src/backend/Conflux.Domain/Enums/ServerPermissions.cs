namespace Conflux.Domain.Enums;

[Flags]
public enum ServerPermissions {
    None = 0,
    
    CreateRole = 1 << 0,
    UpdateRole = 1 << 1,
    DeleteRole = 1 << 2,
    
    CreateChannel = 1 << 2,
    DeleteChannel = 1 << 3,
    
    All = unchecked((int)uint.MaxValue),
}