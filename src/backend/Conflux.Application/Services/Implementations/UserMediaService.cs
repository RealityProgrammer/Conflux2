using Conflux.Domain;
using FileSignatures;
using FileSignatures.Formats;

namespace Conflux.Application.Services.Implementations;

internal sealed class UserMediaService(
    IBlobStorage blobStorage,
    IFileFormatInspector fileFormatInspector
) : IUserMediaService {
    public async Task<Result> UploadAvatar(
        Guid userId, 
        Stream stream, 
        CancellationToken cancellationToken = default
    ) {
        Result<Image> validateResult = ValidateImageFormat(stream);

        if (!validateResult.IsSuccess) {
            return validateResult;
        }

        Image imageFormat = validateResult.Value!;
        
        string key = GetAvatarKey(userId);
        return await blobStorage.Upload(key, stream, imageFormat.MediaType, cancellationToken);
    }

    public async Task<Result> DeleteAvatar(Guid userId, CancellationToken cancellationToken = default) {
        string key = GetAvatarKey(userId);
        return await blobStorage.Delete(key, cancellationToken);
    }

    public async Task<Result<bool>> BackupAvatar(Guid userId, int backupRevision, CancellationToken cancellationToken = default) {
        var result = await blobStorage.Copy(GetAvatarKey(userId), GetAvatarBackupKey(userId, backupRevision), cancellationToken);
        return Result<bool>.Success(result.IsSuccess);
    }

    public async Task<Result> RestoreAvatar(Guid userId, int backupRevision, bool wasBackedUp, CancellationToken cancellationToken = default) {
        var avatarKey = GetAvatarKey(userId);
        var backupKey = GetAvatarBackupKey(userId, backupRevision);

        if (wasBackedUp) {
            var restoreResult = await blobStorage.Copy(backupKey, avatarKey, cancellationToken);
            await blobStorage.Delete(backupKey, cancellationToken);
            return restoreResult;
        }

        return await blobStorage.Delete(avatarKey, cancellationToken);
    }

    public async Task<Result> DeleteAvatarBackup(Guid userId, int backupRevision, CancellationToken cancellationToken = default) {
        return await blobStorage.Delete(GetAvatarBackupKey(userId, backupRevision), cancellationToken);
    }

    public async Task<Result> UploadBanner(
        Guid userId, 
        Stream stream, 
        CancellationToken cancellationToken = default
    ) {
        Result<Image> validateResult = ValidateImageFormat(stream);

        if (!validateResult.IsSuccess) {
            return validateResult;
        }

        Image imageFormat = validateResult.Value!;
        
        string key = GetBannerKey(userId);
        var uploadResult = await blobStorage.Upload(key, stream, imageFormat.MediaType, cancellationToken);

        return uploadResult.IsSuccess ? Result.Success() : uploadResult;
    }

    public async Task<Result> DeleteBanner(Guid userId, CancellationToken cancellationToken = default) {
        string key = GetBannerKey(userId);
        return await blobStorage.Delete(key, cancellationToken);
    }
    
    public async Task<Result<bool>> BackupBanner(Guid userId, int backupRevision, CancellationToken cancellationToken = default) {
        var result = await blobStorage.Copy(GetBannerKey(userId), GetBannerBackupKey(userId, backupRevision), cancellationToken);
        return Result<bool>.Success(result.IsSuccess);
    }

    public async Task<Result> RestoreBanner(Guid userId, int backupRevision, bool wasBackedUp, CancellationToken cancellationToken = default) {
        var bannerKey = GetBannerKey(userId);
        var backupKey = GetBannerBackupKey(userId, backupRevision);

        if (wasBackedUp) {
            var restoreResult = await blobStorage.Copy(backupKey, bannerKey, cancellationToken);
            await blobStorage.Delete(backupKey, cancellationToken);
            return restoreResult;
        }

        return await blobStorage.Delete(bannerKey, cancellationToken);
    }

    public async Task<Result> DeleteBannerBackup(Guid userId, int backupRevision, CancellationToken cancellationToken = default) {
        return await blobStorage.Delete(GetBannerBackupKey(userId, backupRevision), cancellationToken);
    }

    public async Task<string> GetAvatarPreSignedUrl(Guid userId, CancellationToken cancellationToken = default) {
        string key = GetAvatarKey(userId);
        return await blobStorage.GetPreSignedUrl(key, TimeSpan.FromHours(1), cancellationToken: cancellationToken);
    }
    
    public async Task<string> GetBannerPreSignedUrl(Guid userId, CancellationToken cancellationToken = default) {
        string key = GetBannerKey(userId);
        return await blobStorage.GetPreSignedUrl(key, TimeSpan.FromHours(1), cancellationToken: cancellationToken);
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
    
    private static string GetAvatarKey(Guid userId) {
        return $"users/{userId}/avatar";
    }
    
    private static string GetAvatarBackupKey(Guid userId, int revision) {
        return $"users/{userId}/avatar_{revision}";
    }
    
    private static string GetBannerKey(Guid userId) {
        return $"users/{userId}/banner";
    }
    
    private static string GetBannerBackupKey(Guid userId, int revision) {
        return $"users/{userId}/banner_{revision}";
    }
}