using Conflux.Domain.Enums;

namespace Conflux.Domain.Entities;

public class RolePermission {
    public Guid RoleId { get; set; }
    public ServerPermission Permission { get; set; }
    public PermissionState State { get; set; }

    public CommunityServerRole Role { get; set; } = null!;
}