using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Users;

public sealed record DeleteUserAvatarCommand(Guid UserId) : ICommand<Result>;

public sealed class DeleteUserAvatarHandler(
    IUserRepository userRepository,
    IUserMediaService userMediaService
) : ICommandHandler<DeleteUserAvatarCommand, Result> {
    public async ValueTask<Result> Handle(DeleteUserAvatarCommand request, CancellationToken cancellationToken) {
        var result = await userMediaService.DeleteAvatar(request.UserId, cancellationToken);

        if (!result.IsSuccess) {
            return result;
        }

        bool updateSuccessful = await userRepository.UpdateAvatarRevision(request.UserId, null, CancellationToken.None);

        if (updateSuccessful) {
            return Result.Success();
        }
        
        return Errors.OperationFailure("delete user avatar");
    }
}