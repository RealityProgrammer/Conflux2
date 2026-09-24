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
        var uploadResult = await blobStorage.UploadUserAvatar(userId, new(stream, imageFormat.MediaType), cancellationToken);

        if (!uploadResult.IsSuccess) {
            return uploadResult;
        }

        return Result.Success();
    }

    public async Task<Result> DeleteAvatar(Guid userId, CancellationToken cancellationToken = default) {
        return await blobStorage.DeleteUserAvatar(userId, cancellationToken);
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
        var uploadResult = await blobStorage.UploadUserBanner(userId, new(stream, imageFormat.MediaType), cancellationToken);

        if (!uploadResult.IsSuccess) {
            return uploadResult;
        }

        return Result.Success();
    }

    public async Task<Result> DeleteBanner(Guid userId, CancellationToken cancellationToken = default) {
        return await blobStorage.DeleteUserBanner(userId, cancellationToken);
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