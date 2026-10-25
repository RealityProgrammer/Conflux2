using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

internal sealed class ServerMediaService(
    ICommunityServerWriteRepository communityServerWriteRepository,
    IBlobStorage blobStorage,
    IFileFormatInspector fileFormatInspector
) : IServerMediaService {
    public async Task<Result<MediaUploadResult>> UploadAvatar(
        Guid serverId, 
        Stream stream, 
        CancellationToken cancellationToken = default
    ) {
        Result<Image> validateResult = ValidateImageFormat(stream);

        if (!validateResult.IsSuccess) {
            return validateResult.Error;
        }
        
        Image imageFormat = validateResult.Value!;
        
        string key = GetAvatarKey(serverId);
        var uploadResult = await blobStorage.Upload(key, stream, imageFormat.MediaType, cancellationToken);

        return uploadResult.IsSuccess ? Result<MediaUploadResult>.Success(new(imageFormat)) : uploadResult.Error;
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
    
    public async Task<AvatarMediaItemInfo?> GetAvatar(Guid serverId, CancellationToken cancellationToken = default) {
        Stream? attachmentStream = await blobStorage.GetStream(GetAvatarKey(serverId), cancellationToken);
        if (attachmentStream == null) return null;
        
        var info = await communityServerWriteRepository
            .AsQueryable()
            .Where(u => u.Id == serverId)
            .Select(u => u.Avatar != null ? new { u.Avatar.ContentType, u.Avatar.Version } : null)
            .FirstOrDefaultAsync(cancellationToken);

        if (info == null) {
            await blobStorage.Delete(GetAvatarKey(serverId), cancellationToken);
            return null;
        }

        return new(attachmentStream, info.ContentType, info.Version);
    }

    public async Task<BannerMediaItemInfo?> GetBanner(Guid serverId, CancellationToken cancellationToken = default) {
        Stream? attachmentStream = await blobStorage.GetStream(GetBannerKey(serverId), cancellationToken);
        if (attachmentStream == null) return null;
        
        var info = await communityServerWriteRepository
            .AsQueryable()
            .Where(u => u.Id == serverId)
            .Select(u => u.Banner != null ? new { u.Banner.ContentType, u.Banner.Version } : null)
            .FirstOrDefaultAsync(cancellationToken);

        if (info == null) {
            await blobStorage.Delete(GetAvatarKey(serverId), cancellationToken);
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

        if (stream is { CanSeek: true, Position: > 0 }) {
            stream.Position = 0;
        }

        return Result<Image>.Success(imageFormat);
    }
    
    private static string GetAvatarKey(Guid serverId) {
        return $"servers/{serverId}/avatar";
    }
    
    private static string GetBannerKey(Guid serverId) {
        return $"servers/{serverId}/banner";
    }
}