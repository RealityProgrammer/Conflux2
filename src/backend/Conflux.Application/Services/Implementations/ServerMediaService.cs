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
        var uploadResult = await blobStorage.UploadServerAvatar(serverId, new(stream, imageFormat.MediaType), cancellationToken);

        if (!uploadResult.IsSuccess) {
            return uploadResult;
        }
        
        return Result.Success();
    }

    public async Task<Result> DeleteAvatar(Guid serverId, CancellationToken cancellationToken = default) {
        return Result.Success();
    }

    public async Task<Result> UploadBanner(Guid serverId, Stream stream, CancellationToken cancellationToken = default) {
        Result<Image> validateResult = ValidateImageFormat(stream);

        if (!validateResult.IsSuccess) {
            return validateResult;
        }
        
        Image imageFormat = validateResult.Value!;
        var uploadResult = await blobStorage.UploadUserBanner(serverId, new(stream, imageFormat.MediaType), cancellationToken);

        if (!uploadResult.IsSuccess) {
            return uploadResult;
        }
        
        return Result.Success();
    }

    public async Task<Result> DeleteBanner(Guid serverId, CancellationToken cancellationToken = default) {
        return Result.Success();
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
}