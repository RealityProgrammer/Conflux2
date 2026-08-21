using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;

namespace Conflux.Application.Services.Implementations;

internal sealed class UserService(
    IUserRepository userRepository,
    IBlobStorage blobStorage,
    IFileFormatInspector fileFormatInspector
) : IUserService {
    public async Task<Result> UploadAvatar(Guid userId, Stream avatarStream) {
        if (fileFormatInspector.DetermineFileFormat(avatarStream) is not { } fileFormat) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(avatarStream)] = [
                    "Unknown file format.",
                ]
            });
        }

        if (fileFormat is not Image imageFormat) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(avatarStream)] = [
                    "Image file format required.",
                ],
            });
        }

        if (fileFormat.MediaType is not "image/png" and not "image/jpeg") {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(avatarStream)] = [
                    "Only PNG or JPEG image formats are supported.",
                ],
            });
        }
        
        if (avatarStream is { CanSeek: true, Position: > 0 }) {
            avatarStream.Position = 0;
        }
        
        // upload file first.
        Result<string> result = await blobStorage.UploadUserAvatar(userId, new(avatarStream, imageFormat.MediaType));

        if (!result.IsSuccess) {
            return result.Error;
        }

        bool updateSuccessful = await userRepository.UpdateAvatarStatus(userId, true);

        if (updateSuccessful) {
            return Result.Success();
        }
        
        // TODO: Should we delete the avatar on failure? Might need to check if it exists in the first place.

        return Errors.OperationFailure("upload user avatar");
    }

    public async Task<Result> DeleteAvatar(Guid userId) {
        var result = await blobStorage.DeleteUserAvatar(userId);

        if (!result.IsSuccess) {
            return result;
        }

        bool updateSuccessful = await userRepository.UpdateAvatarStatus(userId, false);

        if (updateSuccessful) {
            return Result.Success();
        }
        
        return Errors.OperationFailure("delete user avatar");
    }

    public async Task<Result> SetupProfile(SetupProfileRequest request) {
        Result<bool> validateResult = await userRepository.IsProfileSetup(request.UserId);

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

                await UploadAvatar(request.UserId, stream);
                break;
            
            case AvatarOperationType.Delete:
                await DeleteAvatar(request.UserId);
                break;
        }

        return await userRepository.SetupProfile(request.UserId, request.UserName, request.DisplayName);
    }


    public async Task<Result<UserIdentityProfileDto>> GetIdentityProfile(Guid userId) {
        return await userRepository.GetIdentityProfile(userId);
    }
}