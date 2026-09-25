using Conflux.Application.Dto;
using Conflux.Application.FileFormats;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;

namespace Conflux.Application.Services.Implementations;

public sealed class MessageMediaService(
    IMessageRepository messageRepository,
    IFileFormatInspector fileFormatInspector,
    IBlobStorage blobStorage
) : IMessageMediaService {
    public async Task<Result<Attachment>> UploadAttachment(Stream stream, string fileName, CancellationToken cancellationToken = default) {
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

        return result.IsSuccess ? Result<Attachment>.Success(new() {
            Id = id,
            Name = fileName,
            Type = fileFormat.MediaType,
        }) : result.Error;
    }

    public async Task<Result> DeleteAttachment(Guid attachmentId, CancellationToken cancellationToken = default) {
        return await blobStorage.Delete(GetAttachmentKey(attachmentId), cancellationToken);
    }

    public async Task<Result<string>> GetAttachmentUrl(Guid attachmentId, TimeSpan? expires = null, bool download = false, CancellationToken cancellationToken = default) {
        string key = GetAttachmentKey(attachmentId);
        string? downloadFileName = null;
        
        if (download) {
            Attachment? attachment = await messageRepository.GetAttachmentById(attachmentId, CancellationToken.None);

            if (attachment == null) {
                return Errors.ResourceNotFound($"Attachment (Id = {attachment})");
            }

            downloadFileName = string.IsNullOrEmpty(attachment.Name) ? "file" : attachment.Name;
        }

        var url = await blobStorage.GetPreSignedUrl(key, expires, new BlobDownloadOptions(download, downloadFileName), cancellationToken);
        return Result<string>.Success(url);
    }
    
    private static string GetAttachmentKey(Guid attachmentId) {
        return $"attachments/{attachmentId}";
    }
}