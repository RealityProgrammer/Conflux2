using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;

namespace Conflux.Application.Features.Users;

public sealed record UploadUserAvatarCommand(Guid UserId, Stream AvatarStream) : ICommand<Result>;

public sealed class UploadUserAvatarHandler(
    IUserRepository userRepository,
    IUserMediaService userMediaService
) : ICommandHandler<UploadUserAvatarCommand, Result> {
    public async ValueTask<Result> Handle(UploadUserAvatarCommand command, CancellationToken cancellationToken) {
        Result result = await userMediaService.UploadAvatar(command.UserId, command.AvatarStream, cancellationToken);

        if (!result.IsSuccess) {
            return result.Error;
        }

        bool updateSuccessful = await userRepository.UpdateAvatarStatus(command.UserId, true, CancellationToken.None);

        if (updateSuccessful) {
            return Result.Success();
        }
        
        await userMediaService.DeleteAvatar(command.UserId, CancellationToken.None);
        return Errors.OperationFailure("upload user avatar");
    }
}