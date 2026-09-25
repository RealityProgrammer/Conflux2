using Conflux.Domain;
using Conflux.Domain.Entities;

namespace Conflux.Application.Services;

public interface IMessageMediaService {
    Task<Result<Attachment>> UploadAttachment(Stream stream, string fileName, CancellationToken cancellationToken = default);
    Task<Result> DeleteAttachment(Guid attachmentId, CancellationToken cancellationToken = default);

    Task<Result<string>> GetAttachmentUrl(Guid attachmentId, TimeSpan? expires = null, bool download = false, CancellationToken cancellationToken = default);
}