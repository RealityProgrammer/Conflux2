using Conflux.Application.Commands;
using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class DeleteServerChannelCategoryHandler(
    IChannelCategoryRepository channelCategoryRepository
) : ICommandHandler<DeleteServerChannelCategoryCommand, Result> {
    public async ValueTask<Result> Handle(DeleteServerChannelCategoryCommand request, CancellationToken cancellationToken) {
        bool deleted = await channelCategoryRepository.Delete(request.ServerId, request.CategoryId, cancellationToken);
        return deleted ? Result.Success() : Errors.ResourceNotFound("Channel category");
    }
}