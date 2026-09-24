using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Users;

public sealed record UpdateUserProfileCommand(
    Guid UserId,
    PatchField<string> DisplayName,
    PatchField<string> Pronouns,
    PatchField<string> Biography,
    PatchField<PresenceStatus> ManualPresenceStatus,
    FileOperation AvatarOperation,
    FileOperation BannerOperation
) : ICommand<Result>;

public sealed class UpdateUserProfileHandler(
    IUserRepository userRepository,
    IUserMediaService userMediaService
) : ICommandHandler<UpdateUserProfileCommand, Result> {
    public async ValueTask<Result> Handle(UpdateUserProfileCommand command, CancellationToken cancellationToken) {
        bool? hasAvatar, hasBanner;
        
        switch (command.AvatarOperation.Type) {
            case AvatarOperationType.Set:
                var uploadResult = await userMediaService.UploadAvatar(command.UserId, command.AvatarOperation.AvatarStream!, cancellationToken);

                if (!uploadResult.IsSuccess) {
                    return uploadResult;
                }

                hasAvatar = true;
                break;
            
            case AvatarOperationType.Delete:
                var deleteResult = await userMediaService.DeleteAvatar(command.UserId, cancellationToken);
                
                if (!deleteResult.IsSuccess) {
                    return deleteResult;
                }
                
                hasAvatar = false;
                break;
            
            default:
                hasAvatar = null;
                break;
        }
        
        switch (command.BannerOperation.Type) {
            case AvatarOperationType.Set:
                var uploadResult = await userMediaService.UploadBanner(command.UserId, command.BannerOperation.AvatarStream!, cancellationToken);

                if (!uploadResult.IsSuccess) {
                    return uploadResult;
                }

                hasBanner = true;
                break;
            
            case AvatarOperationType.Delete:
                var deleteResult = await userMediaService.DeleteBanner(command.UserId, cancellationToken);
                
                if (!deleteResult.IsSuccess) {
                    return deleteResult;
                }
                
                hasBanner = false;
                break;
            
            default:
                hasBanner = null;
                break;
        }
        
        if (command.DisplayName.IsSet || 
            command.Pronouns.IsSet ||
            command.Biography.IsSet || 
            command.ManualPresenceStatus.IsSet ||
            hasAvatar.HasValue ||
            hasBanner.HasValue
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

                    if (hasBanner.HasValue) {
                        builder.SetProperty(u => u.HasBanner, hasBanner.Value);
                    }
                }, cancellationToken);

            if (changed == 0) {
                // Delete avatar if has avatar and upload is failed.
                if (hasAvatar.HasValue && hasAvatar.Value) {
                    await userMediaService.DeleteAvatar(command.UserId, CancellationToken.None);
                }
                
                return Errors.NoUserFoundFromId();
            }
        }
        
        return Result.Success();
    }
}