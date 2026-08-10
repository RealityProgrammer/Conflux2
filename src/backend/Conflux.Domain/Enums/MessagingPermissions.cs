namespace Conflux.Domain.Enums;

[Flags]
public enum MessagingPermissions {
    None = 0,
    
    ViewMessage = 1 << 0,
    SendMessage = 1 << 1,
    EditMessage = 1 << 2,
    DeleteMessage = 1 << 3,
    
    All = ViewMessage | SendMessage | EditMessage | DeleteMessage,
}