using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Servers;

public interface IServerCommand : IMessage {
    Guid ServerId { get; }
    IEnumerable<ServerPermission> RequiredPermissions { get; }
}