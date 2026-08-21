using Conflux.Application.Commands;
using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class DeleteServerChannelHandler(
    IChannelRepository channelRepository
) : ICommandHandler<DeleteServerChannelCommand, Result> {
    public async ValueTask<Result> Handle(DeleteServerChannelCommand request, CancellationToken cancellationToken) {
        bool deleted = await channelRepository.Delete(request.ServerId, request.ChannelId, cancellationToken);
        return deleted ? Result.Success() : Errors.ResourceNotFound("Channel category");
    }
}