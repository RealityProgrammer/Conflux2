using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Commands;

public interface IServerCommand : IMessage {
    Guid ExecutorUserId { get; }
    Guid ServerId { get; }
    IEnumerable<ServerPermission> RequiredPermissions { get; }
}