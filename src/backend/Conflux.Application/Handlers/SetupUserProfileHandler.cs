using Conflux.Application.Commands;
using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class SetupUserProfileHandler(
    IUserRepository userRepository,
    IMediator mediator
) : IRequestHandler<SetupUserProfileCommand, Result> {
    public async ValueTask<Result> Handle(SetupUserProfileCommand request, CancellationToken cancellationToken) {
        Result<bool> validateResult = await userRepository.IsProfileSetup(request.UserId, cancellationToken);

        if (!validateResult.IsSuccess) {
            return validateResult.Error;
        }

        if (validateResult.Value) {
            return Errors.UserAlreadyVerified();
        }

        // avatar upload operations, it's probably safe to ignore error results.
        switch (request.AvatarOperation.Type) {
            case AvatarOperationType.Set:
                if (request.AvatarOperation.AvatarStream is not { } stream) {
                    return Errors.MissingArgument("Avatar stream");
                }

                await mediator.Send(new UploadUserAvatarCommand(request.UserId, stream), cancellationToken);
                break;
            
            case AvatarOperationType.Delete:
                await mediator.Send(new DeleteUserAvatarCommand(request.UserId), cancellationToken);
                break;
        }

        return await userRepository.SetupProfile(request.UserId, request.UserName, request.DisplayName, cancellationToken);
    }
}