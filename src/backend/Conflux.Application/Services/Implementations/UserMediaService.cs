using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

internal sealed class UserMediaService(
    IUserRepository userRepository,
    IBlobStorage blobStorage,
    IFileFormatInspector fileFormatInspector
) : IUserMediaService {
    public async Task<Result<MediaUploadResult>> UploadAvatar(
        Guid userId, 
        Stream stream, 
        CancellationToken cancellationToken = default
    ) {
        Result<Image> validateResult = ValidateImageFormat(stream);

        if (!validateResult.IsSuccess) {
            return validateResult.Error;
        }

        Image imageFormat = validateResult.Value!;
        Result uploadResult = await blobStorage.Upload(GetAvatarKey(userId), stream, imageFormat.MediaType, cancellationToken);

        if (!uploadResult.IsSuccess) {
            return uploadResult.Error;
        }

        return Result<MediaUploadResult>.Success(new(imageFormat));
    }

    public async Task<Result> DeleteAvatar(Guid userId, CancellationToken cancellationToken = default) {
        string key = GetAvatarKey(userId);
        return await blobStorage.Delete(key, cancellationToken);
    }

    public async Task<Result> BackupAvatar(Guid userId, CancellationToken cancellationToken = default) {
        return await blobStorage.Copy(GetAvatarKey(userId), GetAvatarBackupKey(userId), cancellationToken);
    }

    public async Task<Result> RestoreAvatar(Guid userId, CancellationToken cancellationToken = default) {
        var avatarKey = GetAvatarKey(userId);
        var backupKey = GetAvatarBackupKey(userId);

        return await blobStorage.Copy(backupKey, avatarKey, cancellationToken);
    }

    public async Task<Result> DeleteAvatarBackup(Guid userId, CancellationToken cancellationToken = default) {
        return await blobStorage.Delete(GetAvatarBackupKey(userId), cancellationToken);
    }

    public async Task<Result<MediaUploadResult>> UploadBanner(
        Guid userId, 
        Stream stream, 
        CancellationToken cancellationToken = default
    ) {
        Result<Image> validateResult = ValidateImageFormat(stream);

        if (!validateResult.IsSuccess) {
            return validateResult.Error;
        }

        Image imageFormat = validateResult.Value!;
        Result uploadResult = await blobStorage.Upload(GetBannerKey(userId), stream, imageFormat.MediaType, cancellationToken);

        if (!uploadResult.IsSuccess) {
            return uploadResult.Error;
        }

        return Result<MediaUploadResult>.Success(new(imageFormat));
    }

    public async Task<Result> DeleteBanner(Guid userId, CancellationToken cancellationToken = default) {
        string key = GetBannerKey(userId);
        return await blobStorage.Delete(key, cancellationToken);
    }
    
    public async Task<Result> BackupBanner(Guid userId, CancellationToken cancellationToken = default) {
        return await blobStorage.Copy(GetBannerKey(userId), GetBannerBackupKey(userId), cancellationToken);
    }

    public async Task<Result> RestoreBanner(Guid userId, CancellationToken cancellationToken = default) {
        var bannerKey = GetBannerKey(userId);
        var backupKey = GetBannerBackupKey(userId);

        return await blobStorage.Copy(backupKey, bannerKey, cancellationToken);
    }

    public async Task<Result> DeleteBannerBackup(Guid userId, CancellationToken cancellationToken = default) {
        return await blobStorage.Delete(GetBannerBackupKey(userId), cancellationToken);
    }

    public async Task<AvatarMediaItemInfo?> GetAvatar(Guid userId, CancellationToken cancellationToken = default) {
        Stream? attachmentStream = await blobStorage.GetStream(GetAvatarKey(userId), cancellationToken);
        if (attachmentStream == null) return null;
        
        var info = await userRepository
            .AsQueryable()
            .Where(u => u.Id == userId)
            .Select(u => u.Avatar != null ? new { u.Avatar.ContentType, u.Avatar.Version } : null)
            .FirstOrDefaultAsync(cancellationToken);

        if (info == null) {
            await blobStorage.Delete(GetAvatarKey(userId), cancellationToken);
            return null;
        }

        return new(attachmentStream, info.ContentType, info.Version);
    }

    public async Task<BannerMediaItemInfo?> GetBanner(Guid userId, CancellationToken cancellationToken = default) {
        Stream? attachmentStream = await blobStorage.GetStream(GetBannerKey(userId), cancellationToken);
        if (attachmentStream == null) return null;
        
        var info = await userRepository
            .AsQueryable()
            .Where(u => u.Id == userId)
            .Select(u => u.Banner != null ? new { u.Banner.ContentType, u.Banner.Version } : null)
            .FirstOrDefaultAsync(cancellationToken);

        if (info == null) {
            await blobStorage.Delete(GetAvatarKey(userId), cancellationToken);
            return null;
        }

        return new(attachmentStream, info.ContentType, info.Version);
    }

    private Result<Image> ValidateImageFormat(Stream stream) {
        if (fileFormatInspector.DetermineFileFormat(stream) is not { } fileFormat) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(stream)] = [
                    "Unknown file format.",
                ]
            });
        }

        if (fileFormat is not Image imageFormat) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(stream)] = [
                    "File is not a valid image format.",
                ],
            });
        }

        if (imageFormat is not Png and not Jpeg and not Webp) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(stream)] = [
                    "Only PNG, JPEG and WEBP image formats are supported.",
                ],
            });
        }

        stream.Position = 0;

        return Result<Image>.Success(imageFormat);
    }

    public async Task Purge(IReadOnlyList<Guid> userIds, CancellationToken cancellationToken = default) {
        if (userIds.Count == 0) return;
        
        var allKeys = userIds.SelectMany(userId => new[] {
            GetAvatarKey(userId),
            GetAvatarBackupKey(userId),
            GetBannerKey(userId),
            GetBannerBackupKey(userId)
        });
        
        await blobStorage.DeleteRange(allKeys, cancellationToken);
    }

    private static string GetAvatarKey(Guid userId) {
        return $"users/{userId}/avatar";
    }
    
    private static string GetAvatarBackupKey(Guid userId) {
        return $"users/{userId}/avatar_backup";
    }
    
    private static string GetBannerKey(Guid userId) {
        return $"users/{userId}/banner";
    }
    
    private static string GetBannerBackupKey(Guid userId) {
        return $"users/{userId}/banner_backup";
    }
}