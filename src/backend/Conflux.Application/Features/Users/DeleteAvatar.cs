using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Users;

public sealed record DeleteUserAvatarCommand(Guid UserId) : ICommand<Result>;

public sealed class DeleteUserAvatarHandler(
    IUserRepository userRepository,
    IMediaItemWriteRepository mediaItemWriteRepository,
    IUserMediaService userMediaService
) : ICommandHandler<DeleteUserAvatarCommand, Result> {
    public async ValueTask<Result> Handle(DeleteUserAvatarCommand command, CancellationToken cancellationToken) {
        var result = await userMediaService.DeleteAvatar(command.UserId, cancellationToken);

        if (!result.IsSuccess) {
            return result;
        }

        var mediaId = await userRepository
            .AsQueryable()
            .Where(u => u.Id == command.UserId)
            .Select(u => u.AvatarId)
            .FirstOrDefaultAsync(CancellationToken.None);

        if (mediaId != null) {
            await mediaItemWriteRepository.Delete(mediaId.Value, CancellationToken.None);
        }

        return Result.Success();    // hmmm...
    }
}