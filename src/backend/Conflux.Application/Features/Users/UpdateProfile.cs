using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
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
) : ICommand<Result>;

public sealed class UpdateProfileHandler(
    IUserRepository userRepository,
    IUserMediaService userMediaService,
    IMediaItemWriteRepository mediaItemWriteRepository,
    IUnitOfWork unitOfWork,
    ILogger<UpdateProfileHandler> logger
) : ICommandHandler<UpdateProfileCommand, Result> {
    public async ValueTask<Result> Handle(UpdateProfileCommand command, CancellationToken cancellationToken) {
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
        
        // process avatar
        if (command.Avatar.IsSet) {
            Result backupResult = await userMediaService.BackupAvatar(userId, cancellationToken);
            
            if (backupResult.IsSuccess) {
                try {
                    await UpdateMedia(
                        userId,
                        command.Avatar.Value,
                        MediaItemType.UserAvatar,
                        u => u.AvatarId,
                        userMediaService.UploadAvatar,
                        userMediaService.DeleteAvatar,
                        usrId => userMediaService.RestoreAvatar(usrId, CancellationToken.None),
                        cancellationToken
                    );
                } finally {
                    await userMediaService.DeleteAvatarBackup(userId, CancellationToken.None);
                }
            } else if (backupResult.Error.Code == nameof(Errors.FileNotExists)) {
                await UpdateMedia(
                    userId,
                    command.Avatar.Value,
                    MediaItemType.UserAvatar,
                    u => u.AvatarId,
                    userMediaService.UploadAvatar,
                    userMediaService.DeleteAvatar,
                    usrId => userMediaService.DeleteAvatar(usrId, CancellationToken.None),
                    cancellationToken
                );
            }
        }
        
        // process banner
        if (command.Banner.IsSet) {
            Result backupResult = await userMediaService.BackupBanner(userId, cancellationToken);
            
            if (backupResult.IsSuccess) {
                try {
                    await UpdateMedia(
                        userId,
                        command.Banner.Value,
                        MediaItemType.UserBanner,
                        u => u.BannerId,
                        userMediaService.UploadBanner,
                        userMediaService.DeleteBanner,
                        usrId => userMediaService.RestoreBanner(usrId, CancellationToken.None),
                        cancellationToken
                    );
                } finally {
                    await userMediaService.DeleteBannerBackup(userId, CancellationToken.None);
                }
            } else if (backupResult.Error.Code == nameof(Errors.FileNotExists)) {
                await UpdateMedia(
                    userId,
                    command.Banner.Value,
                    MediaItemType.UserBanner,
                    u => u.BannerId,
                    userMediaService.UploadBanner,
                    userMediaService.DeleteBanner,
                    usrId => userMediaService.DeleteBanner(usrId, CancellationToken.None),
                    cancellationToken
                );
            }
        }

        return Result.Success();
    }

    private async Task UpdateMedia(
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
                await UpsertMediaItem(
                    userId,
                    mediaItemType,
                    uploadResult.Value!.Format.MediaType,
                    mediaIdSelector,
                    restoreAction,
                    cancellationToken
                );
            }
        } else {
            Result deleteResult = await deleteAction(userId, cancellationToken);

            if (deleteResult.IsSuccess) {
                Guid? mediaId = await userRepository
                    .AsQueryable()
                    .Where(u => u.Id == userId)
                    .Select(mediaIdSelector)
                    .FirstOrDefaultAsync(cancellationToken);

                if (mediaId != null) {
                    await mediaItemWriteRepository
                        .AsQueryable()
                        .Where(i => i.Id == mediaId.Value)
                        .ExecuteDeleteAsync(cancellationToken);
                }
            }
        }
    }

    private async Task UpsertMediaItem(
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
            // update the media content type and version
            await mediaItemWriteRepository
                .AsQueryable()
                .Where(i => i.Id == mediaId.Value)
                .ExecuteUpdateAsync(builder => {
                    builder.SetProperty(i => i.ContentType, contentType);
                    builder.SetProperty(i => i.Version, i => i.Version + 1);
                }, cancellationToken);
        } else {
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
                } else {
                    await unitOfWork.RollbackAsync(CancellationToken.None);
                    await restoreAction(userId);
                }
            } catch (OperationCanceledException) {
                await unitOfWork.RollbackAsync(CancellationToken.None);
                throw;
            } catch (Exception e) {
                logger.LogError(e, "Exception thrown while creating new MediaItem type {type} for user {id}.", mediaItemType, userId);
                await unitOfWork.RollbackAsync(CancellationToken.None);
            }
        }
    }
}