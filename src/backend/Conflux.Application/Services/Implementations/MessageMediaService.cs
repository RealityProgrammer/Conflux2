using Conflux.Application.Dto;
using Conflux.Application.FileFormats;
using Conflux.Domain;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;

namespace Conflux.Application.Services.Implementations;

public sealed class MessageMediaService(
    IFileFormatInspector fileFormatInspector,
    IBlobStorage blobStorage,
    ILogger<MessageMediaService> logger
) : IMessageMediaService {
    public async Task<Result<AttachmentUploadResult[]>> UploadAttachments(
        IReadOnlyList<UploadFile> files, 
        CancellationToken cancellationToken = default
    ) {
        if (files.Count == 0) return Result<AttachmentUploadResult[]>.Success([]);
        
        AttachmentUploadResult[] results = new AttachmentUploadResult[files.Count];
        
        // validate file formats.
        try {
            for (int i = 0; i < files.Count; i++) {
                var stream = files[i].Stream;
                
                if (fileFormatInspector.DetermineFileFormat(stream) is not { } fileFormat) {
                    return Errors.ValidationErrorsOccurred(new() {
                        [$"{nameof(files)}[{i}]"] = [
                            "Unknown file format.",
                        ]
                    });
                }

                if (fileFormat is not Png and not Jpeg and not Gif and not Webp and not WebM and not MP4V1 and not Mpeg4Iso4 and not Wav) {
                    return Errors.ValidationErrorsOccurred(new() {
                        [$"{nameof(files)}[{i}]"] = [
                            $"File format {fileFormat.MediaType} is not allowed.",
                        ],
                    });
                }

                results[i] = new(Guid.NewGuid(), fileFormat, files[i].FileName);
            }
        } finally {
            foreach (var file in files) {
                file.Stream.Seek(0, SeekOrigin.Begin);
            }
        }

        try {
            List<Task<Result>> tasks = [
                .. files.Select((file, index) => blobStorage.Upload(GetAttachmentKey(results[index].Id), file.Stream, results[index].Format.MediaType, cancellationToken)),
            ];

            Result[] uploadResults = await Task.WhenAll(tasks);

            if (uploadResults.Any(r => !r.IsSuccess)) {
                await RollbackUploadedFiles();
                return Errors.OperationFailure("upload message attachments");
            }

            return Result<AttachmentUploadResult[]>.Success(results);
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while uploading attachments for message.");
            
            await RollbackUploadedFiles();
            return Errors.UnexpectedError();
        }

        async Task RollbackUploadedFiles() {
            var deleteResult = await blobStorage.DeleteRange(
                results.Select(r => GetAttachmentKey(r.Id)), 
                CancellationToken.None
            );

            if (!deleteResult.IsSuccess) {
                logger.LogCritical("Unable to compensate the message attachment upload failure: Unable to delete files.");
            }
        }
    }

    public async Task<Result> DeleteAttachments(IReadOnlyCollection<Guid> attachmentIds, CancellationToken cancellationToken = default) {
        return await blobStorage.DeleteRange(attachmentIds.Select(GetAttachmentKey), cancellationToken);
    }

    public string GetPreSignedUrl(Guid attachmentId, TimeSpan expireIn) {
        return blobStorage.GeneratePreSignedUrl(GetAttachmentKey(attachmentId), expireIn);
    }

    public string GetDownloadPreSignedUrl(Guid attachmentId, string? fileName, TimeSpan expireIn) {
        return blobStorage.GenerateDownloadPreSignedUrl(GetAttachmentKey(attachmentId), fileName, expireIn);
    }

    // public async Task<AttachmentMediaItemInfo?> GetAttachment(Guid attachmentId, CancellationToken cancellationToken = default) {
    //     Stream? attachmentStream = await blobStorage.GetStream(GetAttachmentKey(attachmentId), cancellationToken);
    //     if (attachmentStream == null) return null;
    //
    //     var itemInfo = await mediaItemReadRepository
    //         .AsQueryable()
    //         .Where(m => m.Id == attachmentId && m.Type == MediaItemType.MessageAttachment)
    //         .Select(m => new {
    //             m.ContentType,
    //             m.FileName,
    //             m.Version
    //         })
    //         .FirstOrDefaultAsync(cancellationToken);
    //
    //     if (itemInfo == null) {
    //         await blobStorage.Delete(GetAttachmentKey(attachmentId), cancellationToken);
    //         return null;
    //     }
    //
    //     return new(attachmentStream, itemInfo.FileName, itemInfo.ContentType, itemInfo.Version);
    // }
    
    private static string GetAttachmentKey(Guid attachmentId) {
        return $"attachments/{attachmentId}";
    }
}