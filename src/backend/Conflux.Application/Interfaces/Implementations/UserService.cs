using Conflux.Application.Dto.Requests;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;
using Microsoft.Extensions.Configuration;

namespace Conflux.Application.Interfaces.Implementations;

public class UserServiceOptions {
    public long MaxAvatarSizeBytes { get; set; } = 1048576;
}

internal sealed class UserService(
    IUserRepository userRepository,
    IStorageService storageService,
    TimeProvider timeProvider,
    IConfiguration config,
    IFileFormatInspector fileFormatInspector,
    ILogger<UserService> logger
) : IUserService {
    public async Task<Result> UploadAvatarAsync(Guid userId, Stream avatarStream) {
        if (fileFormatInspector.DetermineFileFormat(avatarStream) is not { } fileFormat) {
            return Errors.ValidationErrorsOccured(new() {
                [nameof(avatarStream)] = [
                    "Unknown file format.",
                ]
            });
        }

        if (fileFormat is not Image imageFormat) {
            return Errors.ValidationErrorsOccured(new() {
                [nameof(avatarStream)] = [
                    "Image file format required.",
                ],
            });
        }

        if (fileFormat.MediaType is not "image/png" and not "image/jpeg") {
            return Errors.ValidationErrorsOccured(new() {
                [nameof(avatarStream)] = [
                    "Only PNG or JPEG image formats are supported.",
                ],
            });
        }
        
        if (avatarStream is { CanSeek: true, Position: > 0 }) {
            avatarStream.Position = 0;
        }
        
        // upload file first.
        Result<string> result = await storageService.UploadUserAvatarAsync(userId, new(avatarStream, imageFormat.MediaType));

        if (!result.IsSuccess) {
            return result.Error;
        }

        bool updateSuccessful = await userRepository.UpdateAvatarStatusAsync(userId, true);

        if (updateSuccessful) {
            return Result.Success();
        }
        
        // TODO: Should we delete the avatar on failure? Might need to check if it exists in the first place.

        return Errors.OperationFailure("upload user avatar");
    }

    public string GetAvatarUrl(Guid userId, bool useHttps) {
        return storageService.GetUserAvatarPreSignedUrl(userId, useHttps);
    }

    public async Task<Result> DeleteAvatarAsync(Guid userId) {
        var result = await storageService.DeleteUserAvatarAsync(userId);

        if (!result.IsSuccess) {
            return result;
        }

        bool updateSuccessful = await userRepository.UpdateAvatarStatusAsync(userId, false);

        if (updateSuccessful) {
            return Result.Success();
        }
        
        return Errors.OperationFailure("delete user avatar");
    }

    public async Task<Result> SetupProfileAsync(SetupProfileRequest request) {
        Result<bool> validateResult = await userRepository.IsProfileSetupAsync(request.UserId);

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

                await UploadAvatarAsync(request.UserId, stream);
                break;
            
            case AvatarOperationType.Delete:
                await DeleteAvatarAsync(request.UserId);
                break;
        }

        return await userRepository.SetupProfileAsync(request.UserId, request.UserName, request.DisplayName);
    }

    public async Task<Result<UserBasicProfileDto>> GetUserBasicProfileAsync(Guid userId) {
        return await userRepository.GetProfileSummaryAsync(userId);
    }
}