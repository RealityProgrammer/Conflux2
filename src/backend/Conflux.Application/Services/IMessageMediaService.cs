using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IMessageMediaService {
    Task<Result<AttachmentUploadResult[]>> UploadAttachments(IReadOnlyList<UploadFile> files, CancellationToken cancellationToken = default);
    Task<Result> DeleteAttachments(IReadOnlyCollection<Guid> attachmentIds, CancellationToken cancellationToken = default);
    
    string GetPreSignedUrl(Guid attachmentId, TimeSpan expireIn);
    string GetDownloadPreSignedUrl(Guid attachmentId, string? fileName, TimeSpan expireIn);
}