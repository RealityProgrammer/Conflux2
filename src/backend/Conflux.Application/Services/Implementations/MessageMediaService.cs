using Conflux.Application.Dto;
using Conflux.Application.FileFormats;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

public sealed class MessageMediaService(
    IMediaItemReadRepository mediaItemReadRepository,
    IFileFormatInspector fileFormatInspector,
    IBlobStorage blobStorage
) : IMessageMediaService {
    public async Task<Result<MediaItem>> UploadAttachment(Stream stream, string fileName, CancellationToken cancellationToken = default) {
        if (fileFormatInspector.DetermineFileFormat(stream) is not { } fileFormat) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(stream)] = [
                    "Unknown file format.",
                ]
            });
        }

        if (fileFormat is not Png and not Jpeg and not Gif and not Webp and not MP4V1 and not Mpeg4Iso4 and not Wav) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(stream)] = [
                    "One of the attachments doesn't have supported file format.",
                ],
            });
        }
        
        stream.Position = 0;
        
        Guid id = Guid.NewGuid();
        Result result = await blobStorage.Upload(GetAttachmentKey(id), stream, fileFormat.MediaType, cancellationToken);

        return result.IsSuccess ? Result<MediaItem>.Success(new() {
            Id = id,
            Type = MediaItemType.MessageAttachment,
            FileName = fileName.Length > 256 ? fileName[..256] : fileName,
            ContentType = fileFormat.MediaType,
        }) : result.Error;
    }

    public async Task<Result> DeleteAttachment(Guid attachmentId, CancellationToken cancellationToken = default) {
        return await blobStorage.Delete(GetAttachmentKey(attachmentId), cancellationToken);
    }

    public async Task<AttachmentMediaItemInfo?> GetAttachment(Guid attachmentId, CancellationToken cancellationToken = default) {
        Stream? attachmentStream = await blobStorage.GetStream(GetAttachmentKey(attachmentId), cancellationToken);
        if (attachmentStream == null) return null;

        var itemInfo = await mediaItemReadRepository
            .AsQueryable()
            .Where(m => m.Id == attachmentId && m.Type == MediaItemType.MessageAttachment)
            .Select(m => new {
                m.ContentType,
                m.FileName,
                m.Version
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (itemInfo == null) {
            await blobStorage.Delete(GetAttachmentKey(attachmentId), cancellationToken);
            return null;
        }

        return new(attachmentStream, itemInfo.FileName, itemInfo.ContentType, itemInfo.Version);
    }

    // public async Task<Result<string>> GetAttachmentUrl(Guid attachmentId, TimeSpan? expires = null, bool download = false, CancellationToken cancellationToken = default) {
    //     string key = GetAttachmentKey(attachmentId);
    //     string? downloadFileName = null;
    //     
    //     if (download) {
    //         string? attachmentName = await mediaItemRepository
    //             .AsQueryable()
    //             .Where(a => a.Id == attachmentId)
    //             .Select(a => a.Name)
    //             .FirstOrDefaultAsync(CancellationToken.None);
    //
    //         if (attachmentName == null) {
    //             return Errors.ResourceNotFound($"Attachment (Id = {attachmentId})");
    //         }
    //
    //         downloadFileName = string.IsNullOrEmpty(attachmentName) ? "file" : attachmentName;
    //     }
    //
    //     var url = await blobStorage.GetPreSignedUrl(key, expires, new BlobDownloadOptions(download, downloadFileName), cancellationToken);
    //     return Result<string>.Success(url);
    // }
    
    private static string GetAttachmentKey(Guid attachmentId) {
        return $"attachments/{attachmentId}";
    }
}