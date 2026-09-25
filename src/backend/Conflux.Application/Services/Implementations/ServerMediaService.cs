using Conflux.Domain;
using FileSignatures;
using FileSignatures.Formats;

namespace Conflux.Application.Services.Implementations;

internal sealed class ServerMediaService(
    IBlobStorage blobStorage,
    IFileFormatInspector fileFormatInspector
) : IServerMediaService {
    public async Task<Result> UploadAvatar(Guid serverId, Stream stream, CancellationToken cancellationToken = default) {
        Result<Image> validateResult = ValidateImageFormat(stream);

        if (!validateResult.IsSuccess) {
            return validateResult;
        }
        
        Image imageFormat = validateResult.Value!;
        
        string key = GetAvatarKey(serverId);
        var uploadResult = await blobStorage.Upload(key, stream, imageFormat.MediaType, cancellationToken);

        return uploadResult.IsSuccess ? Result.Success() : uploadResult;
    }

    public async Task<Result> DeleteAvatar(Guid serverId, CancellationToken cancellationToken = default) {
        string key = GetAvatarKey(serverId);
        return await blobStorage.Delete(key, cancellationToken);
    }

    public async Task<Result> UploadBanner(Guid serverId, Stream stream, CancellationToken cancellationToken = default) {
        Result<Image> validateResult = ValidateImageFormat(stream);

        if (!validateResult.IsSuccess) {
            return validateResult;
        }
        
        Image imageFormat = validateResult.Value!;
        
        string key = GetBannerKey(serverId);
        return await blobStorage.Upload(key, stream, imageFormat.MediaType, cancellationToken);
    }

    public async Task<Result> DeleteBanner(Guid serverId, CancellationToken cancellationToken = default) {
        string key = GetBannerKey(serverId);
        return await blobStorage.Delete(key, cancellationToken);
    }
    
    public async Task<string> GetAvatarPreSignedUrl(Guid serverId, CancellationToken cancellationToken = default) {
        string key = GetAvatarKey(serverId);
        return await blobStorage.GetPreSignedUrl(key, TimeSpan.FromHours(1), cancellationToken: cancellationToken);
    }
    
    public async Task<string> GetBannerPreSignedUrl(Guid serverId, CancellationToken cancellationToken = default) {
        string key = GetBannerKey(serverId);
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

        if (stream is { CanSeek: true, Position: > 0 }) {
            stream.Position = 0;
        }

        return Result<Image>.Success(imageFormat);
    }
    
    private static string GetAvatarKey(Guid userId) {
        return $"servers/{userId}/avatar";
    }
    
    private static string GetBannerKey(Guid userId) {
        return $"servers/{userId}/banner";
    }
}