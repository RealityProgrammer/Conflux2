using Conflux.Application.Enums;
using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Commands;

public sealed record CreateServerChannelCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    string Name,
    CommunityServerChannelType Type,
    Guid? ChannelCategoryId
) : ICommand<Result<Guid>>, IServerCommand {
    public ServerPermissions RequiredPermissions => ServerPermissions.CreateChannel;
}