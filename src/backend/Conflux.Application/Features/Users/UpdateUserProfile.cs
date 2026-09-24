using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Users;

public sealed record UpdateUserProfileCommand(
    Guid UserId,
    PatchField<string> DisplayName,
    PatchField<string> Pronouns,
    PatchField<string> Biography,
    PatchField<PresenceStatus> ManualPresenceStatus,
    AvatarOperation AvatarOperation
) : ICommand<Result>;

public sealed class UpdateUserProfileHandler(
    IUserRepository userRepository,
    IBlobStorage blobStorage,
    IFileFormatInspector fileFormatInspector
) : ICommandHandler<UpdateUserProfileCommand, Result> {
    public async ValueTask<Result> Handle(UpdateUserProfileCommand command, CancellationToken cancellationToken) {
        bool? hasAvatar;
        
        switch (command.AvatarOperation.Type) {
            case AvatarOperationType.Set:
                Stream avatarStream = command.AvatarOperation.AvatarStream!;

                if (fileFormatInspector.DetermineFileFormat(avatarStream) is not { } fileFormat) {
                    return Errors.ValidationErrorsOccurred(new() {
                        [nameof(UploadUserAvatarCommand.AvatarStream)] = [
                            "Unknown file format.",
                        ]
                    });
                }

                if (fileFormat is not Image imageFormat) {
                    return Errors.ValidationErrorsOccurred(new() {
                        [nameof(UploadUserAvatarCommand.AvatarStream)] = [
                            "File is not a valid image format.",
                        ],
                    });
                }

                if (imageFormat is not Png and not Jpeg and not Webp) {
                    return Errors.ValidationErrorsOccurred(new() {
                        [nameof(UploadUserAvatarCommand.AvatarStream)] = [
                            "Only PNG, JPEG and WEBP image formats are supported.",
                        ],
                    });
                }

                if (avatarStream is { CanSeek: true, Position: > 0 }) {
                    avatarStream.Position = 0;
                }

                // upload
                var uploadResult = await blobStorage.UploadUserAvatar(command.UserId, new(avatarStream, fileFormat.MediaType), cancellationToken);

                if (!uploadResult.IsSuccess) {
                    return uploadResult;
                }

                hasAvatar = true;
                break;
            
            case AvatarOperationType.Delete:
                var deleteResult = await blobStorage.DeleteUserAvatar(command.UserId, cancellationToken);
                
                if (!deleteResult.IsSuccess) {
                    return deleteResult;
                }
                
                hasAvatar = false;
                break;
            
            default:
                hasAvatar = null;
                break;
        }
        
        if (command.DisplayName.IsSet || 
            command.Pronouns.IsSet ||
            command.Biography.IsSet || 
            command.ManualPresenceStatus.IsSet ||
            hasAvatar.HasValue
        ) {
            int changed = await userRepository.AsQueryable()
                .Where(u => u.Id == command.UserId)
                .ExecuteUpdateAsync(builder => {
                    if (command.DisplayName.IsSet) {
                        builder.SetProperty(u => u.DisplayName, command.DisplayName.Value);
                    }

                    if (command.Pronouns.IsSet) {
                        var value = command.Pronouns.Value;
                        builder.SetProperty(u => u.Pronouns, string.IsNullOrEmpty(value) ? null : value);
                    }
                    
                    if (command.Biography.IsSet) {
                        var value = command.Biography.Value;
                        builder.SetProperty(u => u.Biography, string.IsNullOrEmpty(value) ? null : value);
                    }
                    
                    if (command.ManualPresenceStatus.IsSet) {
                        builder.SetProperty(u => u.ManualPresenceStatus, command.ManualPresenceStatus.Value);
                    }

                    if (hasAvatar.HasValue) {
                        builder.SetProperty(u => u.HasAvatar, hasAvatar.Value);
                    }
                }, cancellationToken);

            if (changed == 0) {
                // Delete avatar if has avatar and upload is failed.
                if (hasAvatar.HasValue && hasAvatar.Value) {
                    await blobStorage.DeleteUserAvatar(command.UserId, CancellationToken.None);
                }
                
                return Errors.NoUserFoundFromId();
            }
        }
        
        return Result.Success();
    }
}