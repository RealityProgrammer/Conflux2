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

public sealed class DeleteServerChannelCategoryHandler(
    IChannelCategoryRepository channelCategoryRepository
) : ICommandHandler<DeleteServerChannelCategoryCommand, Result> {
    public async ValueTask<Result> Handle(DeleteServerChannelCategoryCommand request, CancellationToken cancellationToken) {
        bool deleted = await channelCategoryRepository.Delete(request.ServerId, request.CategoryId, cancellationToken);
        return deleted ? Result.Success() : Errors.ResourceNotFound("Channel category");
    }
}