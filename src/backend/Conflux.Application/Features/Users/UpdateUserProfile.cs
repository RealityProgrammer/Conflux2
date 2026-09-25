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
        int avatarRevision = Random.Shared.Next(1, int.MaxValue), bannerRevision = Random.Shared.Next(1, int.MaxValue);
        bool avatarBackedUp = false, bannerBackedUp = false;
        bool avatarTouched = false, bannerTouched = false;
        bool? hasAvatar = null, hasBanner = null;

        try {
            // process avatar and banner
            if (command.AvatarOperation.Type != FileOperationType.NoMod) {
                var backupRes = await userMediaService.BackupAvatar(command.UserId, avatarRevision, cancellationToken);
                avatarBackedUp = backupRes.Value;

                if (command.AvatarOperation.Type == FileOperationType.Set) {
                    var uploadResult = await userMediaService.UploadAvatar(command.UserId, command.AvatarOperation.Stream!, cancellationToken);
                    if (!uploadResult.IsSuccess) return uploadResult;
                    
                    hasAvatar = avatarTouched = true;
                } else {
                    await userMediaService.DeleteAvatar(command.UserId, cancellationToken);

                    avatarTouched = true;
                    hasAvatar = false;
                }
            }
            
            if (command.BannerOperation.Type != FileOperationType.NoMod) {
                var backupRes = await userMediaService.BackupBanner(command.UserId, bannerRevision, cancellationToken);
                bannerBackedUp = backupRes.Value;

                if (command.BannerOperation.Type == FileOperationType.Set) {
                    var uploadResult = await userMediaService.UploadBanner(command.UserId, command.BannerOperation.Stream!, cancellationToken);
                    if (!uploadResult.IsSuccess) {
                        await RollbackAsync();
                        return uploadResult;
                    }
                    
                    hasBanner = bannerTouched = true;
                } else {
                    await userMediaService.DeleteBanner(command.UserId, cancellationToken);

                    bannerTouched = true;
                    hasBanner = false;
                }
            }
            
            // process database
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
                        if (command.DisplayName.IsSet) 
                            builder.SetProperty(u => u.DisplayName, command.DisplayName.Value);

                        if (command.Pronouns.IsSet) 
                            builder.SetProperty(u => u.Pronouns, string.IsNullOrEmpty(command.Pronouns.Value) ? null : command.Pronouns.Value);

                        if (command.Biography.IsSet) 
                            builder.SetProperty(u => u.Biography, string.IsNullOrEmpty(command.Biography.Value) ? null : command.Biography.Value);

                        if (command.ManualPresenceStatus.IsSet) 
                            builder.SetProperty(u => u.ManualPresenceStatus, command.ManualPresenceStatus.Value);

                        if (hasAvatar.HasValue) 
                            builder.SetProperty(u => u.AvatarRevision, hasAvatar.Value ? avatarRevision : null);

                        if (hasBanner.HasValue) 
                            builder.SetProperty(u => u.BannerRevision, hasBanner.Value ? bannerRevision : null);
                    }, cancellationToken);

                if (changed == 0) {
                    await RollbackAsync();
                    return Errors.NoUserFoundFromId();
                }
            }
            
            // cleanup old backup files
            if (avatarBackedUp) {
                await userMediaService.DeleteAvatarBackup(command.UserId, avatarRevision, CancellationToken.None);
            }
            
            if (bannerBackedUp) {
                await userMediaService.DeleteBannerBackup(command.UserId, bannerRevision, CancellationToken.None);
            }
            
            return Result.Success();
        } catch {
            await RollbackAsync();
            throw;
        }
        
        async Task RollbackAsync() {
            if (avatarTouched) {
                await userMediaService.RestoreAvatar(command.UserId, avatarRevision, avatarBackedUp, CancellationToken.None);
            }
            if (bannerTouched) {
                await userMediaService.RestoreBanner(command.UserId, bannerRevision, bannerBackedUp, CancellationToken.None);
            }
        }
    }
}