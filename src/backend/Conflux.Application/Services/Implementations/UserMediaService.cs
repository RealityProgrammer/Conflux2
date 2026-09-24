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

        // upload
        var uploadResult = await blobStorage.UploadUserAvatar(userId, new(stream, fileFormat.MediaType), cancellationToken);

        if (!uploadResult.IsSuccess) {
            return uploadResult;
        }

        return Result.Success();
    }

    public async Task<Result> DeleteAvatar(Guid userId, CancellationToken cancellationToken = default) {
        return await blobStorage.DeleteUserAvatar(userId, cancellationToken);
    }
}