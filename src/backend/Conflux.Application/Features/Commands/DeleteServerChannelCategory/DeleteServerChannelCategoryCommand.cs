using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Commands.DeleteServerChannelCategory;

public sealed record DeleteServerChannelCategoryCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid CategoryId
) : ICommand<Result>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.DeleteChannel];
}