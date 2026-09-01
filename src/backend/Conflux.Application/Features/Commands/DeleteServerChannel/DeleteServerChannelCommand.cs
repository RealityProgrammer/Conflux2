using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Commands.DeleteServerChannel;

public sealed record DeleteServerChannelCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid ChannelId
) : ICommand<Result>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.DeleteChannel];
}