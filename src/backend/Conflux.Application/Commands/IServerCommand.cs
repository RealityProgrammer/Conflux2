using Conflux.Domain.Enums;

namespace Conflux.Application.Commands;

public interface IServerCommand {
    Guid ExecutorUserId { get; }
    Guid ServerId { get; }
    ServerPermissions RequiredPermissions { get; }
}