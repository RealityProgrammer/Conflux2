using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Servers;

public sealed record DeleteServerChannelCategoryCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    Guid CategoryId
) : ICommand<Result>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.DeleteChannel];
}

public sealed record ServerChannelCategoryDeletedNotification(Guid ServerId, Guid CategoryId) : INotification;

public sealed class DeleteServerChannelCategoryHandler(
    IChannelCategoryRepository channelCategoryRepository,
    IMediator mediator
) : ICommandHandler<DeleteServerChannelCategoryCommand, Result> {
    public async ValueTask<Result> Handle(DeleteServerChannelCategoryCommand request, CancellationToken cancellationToken) {
        bool deleted = await channelCategoryRepository.Delete(request.ServerId, request.CategoryId, cancellationToken);

        if (deleted) {
            await mediator.Publish(new ServerChannelCategoryDeletedNotification(request.ServerId, request.CategoryId), CancellationToken.None);
            return Result.Success();
        }
        
        return Errors.ResourceNotFound("Channel category");
    }
}