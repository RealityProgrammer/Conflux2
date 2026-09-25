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
        
        string key = GetAvatarUniqueKey(userId);
        return await blobStorage.Upload(key, stream, imageFormat.MediaType, cancellationToken);
    }

    public async Task<Result> DeleteAvatar(Guid userId, CancellationToken cancellationToken = default) {
        string key = GetAvatarUniqueKey(userId);
        return await blobStorage.Delete(key, cancellationToken);
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
        
        string key = CreateUserBannerUniqueKey(userId);
        var uploadResult = await blobStorage.Upload(key, stream, imageFormat.MediaType, cancellationToken);

        return uploadResult.IsSuccess ? Result.Success() : uploadResult;
    }

    public async Task<Result> DeleteBanner(Guid userId, CancellationToken cancellationToken = default) {
        string key = CreateUserBannerUniqueKey(userId);
        return await blobStorage.Delete(key, cancellationToken);
    }

    public async Task<string> GetAvatarPreSignedUrl(Guid userId, CancellationToken cancellationToken = default) {
        string key = GetAvatarUniqueKey(userId);
        return await blobStorage.GetPreSignedUrl(key, TimeSpan.FromHours(1), cancellationToken: cancellationToken);
    }
    
    public async Task<string> GetBannerPreSignedUrl(Guid userId, CancellationToken cancellationToken = default) {
        string key = CreateUserBannerUniqueKey(userId);
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
    
    private static string GetAvatarUniqueKey(Guid userId) {
        return $"users/{userId}/avatar";
    }
    
    private static string CreateUserBannerUniqueKey(Guid userId) {
        return $"users/{userId}/banner";
    }
}