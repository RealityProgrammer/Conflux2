using Conflux.Application.Dto;
using Conflux.Domain;
using FileSignatures;
using FileSignatures.Formats;

namespace Conflux.Application.Services.Implementations;

internal sealed class EmojiMediaService(
    IFileFormatInspector fileFormatInspector,
    IBlobStorage blobStorage
) : IEmojiMediaService {
    public async Task<Result<MediaUploadResult>> Upload(Guid emojiId, Stream stream, CancellationToken cancellationToken = default) {
        Result<Image> validateResult = ValidateImageFormat(stream);

        if (!validateResult.IsSuccess) {
            return validateResult.Error;
        }
        
        Image imageFormat = validateResult.Value!;
        
        string key = GetStorageKey(emojiId);
        var uploadResult = await blobStorage.Upload(key, stream, imageFormat.MediaType, cancellationToken);

        return uploadResult.IsSuccess ? Result<MediaUploadResult>.Success(new(imageFormat)) : uploadResult.Error;
    }

    public async Task<Result> Delete(Guid emojiId, CancellationToken cancellationToken = default) {
        string key = GetStorageKey(emojiId);
        return await blobStorage.Delete(key, cancellationToken);
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
    
    private static string GetStorageKey(Guid emojiId) {
        return $"emojis/{emojiId}";
    }
}