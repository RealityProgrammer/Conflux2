using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Commands;

public sealed record DeleteServerChannelCategoryCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid CategoryId
) : ICommand<Result>, IServerCommand {
    public ServerPermissions RequiredPermissions => ServerPermissions.DeleteChannel;
}