using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Servers;

public sealed record DeleteServerChannelCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid ChannelId
) : ICommand<Result>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.DeleteChannel];
}

public sealed record ServerChannelDeletedNotification(
    Guid ServerId,
    Guid ChannelId
) : INotification;

public sealed class DeleteServerChannelHandler(
    IChannelRepository channelRepository,
    IMediator mediator
) : ICommandHandler<DeleteServerChannelCommand, Result> {
    public async ValueTask<Result> Handle(DeleteServerChannelCommand request, CancellationToken cancellationToken) {
        bool deleted = await channelRepository.Delete(request.ServerId, request.ChannelId, cancellationToken);

        if (deleted) {
            await mediator.Publish(new ServerChannelDeletedNotification(request.ServerId, request.ChannelId), CancellationToken.None);
            return Result.Success();
        }
        
        return Errors.ResourceNotFound("Channel category");
    }
}