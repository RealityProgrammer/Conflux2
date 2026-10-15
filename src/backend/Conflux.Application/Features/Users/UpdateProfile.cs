using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Conflux.Application.Features.Users;

public sealed record UpdateProfileCommand(
    Guid UserId,
    PatchField<string> DisplayName,
    PatchField<string> Pronouns,
    PatchField<string> Biography,
    PatchField<PresenceStatus> ManualPresenceStatus,
    PatchField<Stream?> Avatar,
    PatchField<Stream?> Banner
) : ICommand<Result<UpdateProfileResult>>;

public sealed class UpdateProfileResult {
    public Optional<int?> AvatarVersion { get; set; }
    public Optional<int?> BannerVersion { get; set; }
}

public sealed class UpdateProfileHandler(
    IUserRepository userRepository,
    IUserMediaService userMediaService,
    IMediaItemWriteRepository mediaItemWriteRepository,
    IUnitOfWork unitOfWork,
    ILogger<UpdateProfileHandler> logger
) : ICommandHandler<UpdateProfileCommand, Result<UpdateProfileResult>> {
    public async ValueTask<Result<UpdateProfileResult>> Handle(
        UpdateProfileCommand command, 
        CancellationToken cancellationToken
    ) {
        Guid userId = command.UserId;
        
        // update fields that can be updated with single database call.
        if (command.DisplayName.IsSet || 
            command.Pronouns.IsSet || 
            command.Biography.IsSet || 
            command.ManualPresenceStatus.IsSet
        ) {
            bool success = await userRepository
                .AsQueryable()
                .Where(u => u.Id == userId)
                .ExecuteUpdateAsync(builder => {
                    if (command.DisplayName.IsSet) 
                        builder.SetProperty(u => u.DisplayName, command.DisplayName.Value);
                        
                    if (command.Pronouns.IsSet) 
                        builder.SetProperty(u => u.Pronouns, string.IsNullOrEmpty(command.Pronouns.Value) ? null : command.Pronouns.Value);
                        
                    if (command.Biography.IsSet) 
                        builder.SetProperty(u => u.Biography, string.IsNullOrEmpty(command.Biography.Value) ? null : command.Biography.Value);
                        
                    if (command.ManualPresenceStatus.IsSet) 
                        builder.SetProperty(u => u.ManualPresenceStatus, command.ManualPresenceStatus.Value);
                }, cancellationToken) == 1;

            if (!success) {
                return Errors.NoUserFoundFromId();
            }
        }

        Optional<int?> avatarVersion = default;
        
        // process avatar
        if (command.Avatar.IsSet) {
            Result backupResult = await userMediaService.BackupAvatar(userId, cancellationToken);
            
            if (backupResult.IsSuccess) {
                try {
                    Result<int?> updateResult = await UpdateMedia(
                        userId,
                        command.Avatar.Value,
                        MediaItemType.UserAvatar,
                        u => u.AvatarId,
                        userMediaService.UploadAvatar,
                        userMediaService.DeleteAvatar,
                        usrId => userMediaService.RestoreAvatar(usrId, CancellationToken.None),
                        cancellationToken
                    );

                    if (updateResult.IsSuccess) {
                        avatarVersion = updateResult.Value;
                    }
                } finally {
                    await userMediaService.DeleteAvatarBackup(userId, CancellationToken.None);
                }
            } else if (backupResult.Error.Code == nameof(Errors.FileNotExists)) {
                Result<int?> updateResult = await UpdateMedia(
                    userId,
                    command.Avatar.Value,
                    MediaItemType.UserAvatar,
                    u => u.AvatarId,
                    userMediaService.UploadAvatar,
                    userMediaService.DeleteAvatar,
                    usrId => userMediaService.DeleteAvatar(usrId, CancellationToken.None),
                    cancellationToken
                );

                if (updateResult.IsSuccess) {
                    avatarVersion = updateResult.Value;
                }
            }
        }
        
        Optional<int?> bannerVersion = default;
        
        // process banner
        if (command.Banner.IsSet) {
            Result backupResult = await userMediaService.BackupBanner(userId, cancellationToken);
            
            if (backupResult.IsSuccess) {
                try {
                    Result<int?> updateResult =  await UpdateMedia(
                        userId,
                        command.Banner.Value,
                        MediaItemType.UserBanner,
                        u => u.BannerId,
                        userMediaService.UploadBanner,
                        userMediaService.DeleteBanner,
                        usrId => userMediaService.RestoreBanner(usrId, CancellationToken.None),
                        cancellationToken
                    );

                    if (updateResult.IsSuccess) {
                        bannerVersion = updateResult.Value;
                    }
                } finally {
                    await userMediaService.DeleteBannerBackup(userId, CancellationToken.None);
                }
            } else if (backupResult.Error.Code == nameof(Errors.FileNotExists)) {
                Result<int?> updateResult =  await UpdateMedia(
                    userId,
                    command.Banner.Value,
                    MediaItemType.UserBanner,
                    u => u.BannerId,
                    userMediaService.UploadBanner,
                    userMediaService.DeleteBanner,
                    usrId => userMediaService.DeleteBanner(usrId, CancellationToken.None),
                    cancellationToken
                );
                
                bannerVersion = updateResult.Value;
            }
        }

        return Result<UpdateProfileResult>.Success(new() {
            AvatarVersion = avatarVersion,
            BannerVersion = bannerVersion,
        });
    }

    private async Task<Result<int?>> UpdateMedia(
        Guid userId, 
        Stream? stream,
        MediaItemType mediaItemType,
        Expression<Func<ApplicationUser, Guid?>> mediaIdSelector,
        Func<Guid, Stream, CancellationToken, Task<Result<MediaUploadResult>>> uploadAction,
        Func<Guid, CancellationToken, Task<Result>> deleteAction,
        Func<Guid, Task> restoreAction,
        CancellationToken cancellationToken = default
    ) {
        if (stream != null) {
            Result<MediaUploadResult> uploadResult = 
                await uploadAction(userId, stream, cancellationToken);

            if (uploadResult.IsSuccess) {
                return await UpsertMediaItem(
                    userId,
                    mediaItemType,
                    uploadResult.Value!.Format.MediaType,
                    mediaIdSelector,
                    restoreAction,
                    cancellationToken
                );
            }

            return uploadResult.Error;
        } else {
            Result deleteResult = await deleteAction(userId, cancellationToken);

            if (deleteResult.IsSuccess) {
                Guid? mediaId = await userRepository
                    .AsQueryable()
                    .Where(u => u.Id == userId)
                    .Select(mediaIdSelector)
                    .FirstOrDefaultAsync(cancellationToken);

                if (mediaId != null) {
                    await userRepository
                        .AsQueryable()
                        .Where(u => u.Id == userId)
                        .ExecuteUpdateAsync(builder => {
                            builder.SetProperty(mediaIdSelector, (Guid?)null);
                        }, cancellationToken);
                    
                    await mediaItemWriteRepository
                        .AsQueryable()
                        .Where(i => i.Id == mediaId.Value)
                        .ExecuteDeleteAsync(cancellationToken);

                    return Result<int?>.Success(null);
                }
            }

            return deleteResult.Error;
        }
    }

    private async Task<Result<int?>> UpsertMediaItem(
        Guid userId, 
        MediaItemType mediaItemType,
        string contentType,
        Expression<Func<ApplicationUser, Guid?>> mediaIdSelector,
        Func<Guid, Task> restoreAction,
        CancellationToken cancellationToken = default
    ) {
        Guid? mediaId = await userRepository
            .AsQueryable()
            .Where(u => u.Id == userId)
            .Select(mediaIdSelector)
            .FirstOrDefaultAsync(cancellationToken);
        
        if (mediaId != null) {
            int? version = await mediaItemWriteRepository.Update(mediaId.Value, contentType, cancellationToken);

            if (version == null) {
                return Errors.OperationFailure("update media content type");
            }

            return Result<int?>.Success(version);
        }
        
        // begin transaction, add new media item and update foreign key to it
        await unitOfWork.BeginTransactionAsync(cancellationToken);

        try {
            MediaItem mediaItem = new() {
                Type = mediaItemType,
                ContentType = contentType,
                Version = 1,
            };

            mediaItemWriteRepository.Add(mediaItem);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            bool success = await userRepository
                .AsQueryable()
                .Where(u => u.Id == userId)
                .ExecuteUpdateAsync(builder => {
                    builder.SetProperty(mediaIdSelector, mediaItem.Id);
                }, cancellationToken) == 1;

            if (success) {
                await unitOfWork.SaveChangesAsync(cancellationToken);
                await unitOfWork.CommitAsync(cancellationToken);

                return Result<int?>.Success(mediaItem.Version);
            }
            
            await unitOfWork.RollbackAsync(CancellationToken.None);
            await restoreAction(userId);
            
            return Errors.OperationFailure("create media item");
        } catch (OperationCanceledException) {
            await unitOfWork.RollbackAsync(CancellationToken.None);
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while creating new MediaItem type {type} for user {id}.", mediaItemType, userId);
            await unitOfWork.RollbackAsync(CancellationToken.None);

            return Errors.UnexpectedError();
        }
    }
}