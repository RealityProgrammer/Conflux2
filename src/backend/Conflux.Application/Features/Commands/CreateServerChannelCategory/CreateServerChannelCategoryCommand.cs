using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Commands.CreateServerChannelCategory;

public sealed record CreateServerChannelCategoryCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    string Name
) : ICommand<Result<Guid>>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.CreateChannel];
}